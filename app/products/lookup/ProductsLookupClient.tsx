'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type BranchOption = {
  id: string;
  name: string;
};

type ProductLookupRow = {
  product_id: string;
  name: string;
  internal_code: string | null;
  barcode: string | null;
  unit_price: number;
  stock_on_hand: number;
};

type Props = {
  orgId: string;
  branches: BranchOption[];
  defaultBranchId: string;
};

const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 250;
const RESULT_LIMIT = 30;
const BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
] as const;

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);

const formatStock = (value: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value);

const tokenizeQuery = (query: string) =>
  query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const mergeLookupResults = (
  byBarcode: ProductLookupRow[],
  byName: ProductLookupRow[],
) => {
  const map = new Map<string, ProductLookupRow>();

  for (const row of byBarcode) {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, row);
    }
  }

  for (const row of byName) {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, row);
    }
  }

  return Array.from(map.values()).slice(0, RESULT_LIMIT);
};

export default function ProductsLookupClient({
  orgId,
  branches,
  defaultBranchId,
}: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductLookupRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualCodeOpen, setIsManualCodeOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannerErrorMessage, setScannerErrorMessage] = useState<string | null>(
    null,
  );
  const [scannerHint, setScannerHint] = useState<string | null>(null);
  const [canUseCameraScanner, setCanUseCameraScanner] = useState<
    boolean | null
  >(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const instantSearchRef = useRef(false);

  const queryTokens = useMemo(() => tokenizeQuery(query), [query]);
  const shouldSearch = query.trim().length >= SEARCH_MIN_CHARS;
  const visibleResults = shouldSearch ? results : [];

  const handleBranchChange = (value: string) => {
    setBranchId(value);
    setErrorMessage(null);
    setIsLoading(false);
  };

  const applyQuery = useCallback((value: string, options?: { instant?: boolean }) => {
    setQuery(value);
    setErrorMessage(null);

    if (options?.instant) {
      instantSearchRef.current = true;
    }

    if (value.trim().length < SEARCH_MIN_CHARS) {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    applyQuery(value);
  };

  const handleQueryClear = () => {
    setResults([]);
    setErrorMessage(null);
    applyQuery('');
  };

  const stopScanner = useCallback(() => {
    if (animationFrameRef.current != null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    isDetectingRef.current = false;
  }, []);

  const closeScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScannerHint(null);
    stopScanner();
  }, [stopScanner]);

  const openScanner = useCallback(() => {
    if (!canUseCameraScanner) {
      setIsManualCodeOpen((prev) => !prev);
      setIsScannerOpen(false);
      setScannerErrorMessage(null);
      setScannerHint(null);
      return;
    }

    setScannerErrorMessage(null);
    setScannerHint(null);
    setIsManualCodeOpen(false);
    setIsScannerOpen(true);
  }, [canUseCameraScanner]);

  const applyManualCode = () => {
    const code = manualCode.trim();
    if (!code) return;
    applyQuery(code, { instant: true });
    setIsManualCodeOpen(false);
    setManualCode('');
  };

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      Boolean(
        (window as Window & { BarcodeDetector?: BarcodeDetectorCtor })
          .BarcodeDetector,
      );
    setCanUseCameraScanner(supported);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (!isScannerOpen) {
      return;
    }

    let cancelled = false;
    const windowWithDetector = window as Window & {
      BarcodeDetector?: BarcodeDetectorCtor;
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerErrorMessage(
          'Tu dispositivo no permite usar cámara desde este navegador.',
        );
        return;
      }

      const BarcodeDetector = windowWithDetector.BarcodeDetector;
      if (!BarcodeDetector) {
        setScannerErrorMessage('Este navegador no soporta lector con cámara.');
        setIsManualCodeOpen(true);
        return;
      }

      setScannerHint('Apuntá la cámara al código de barras.');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
        });

        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        const video = videoRef.current;
        if (!video) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          setScannerErrorMessage(
            'No pudimos iniciar el lector de cámara. Reintentá.',
          );
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetector({ formats: [...BARCODE_FORMATS] });

        const scanFrame = async () => {
          if (cancelled) {
            return;
          }

          const currentVideo = videoRef.current;
          if (
            currentVideo &&
            !isDetectingRef.current &&
            currentVideo.readyState >= 2
          ) {
            isDetectingRef.current = true;
            try {
              const detections = await detector.detect(currentVideo);
              const foundValue = detections
                .map((item) => item.rawValue?.trim() ?? '')
                .find((item) => item.length > 0);

              if (foundValue) {
                applyQuery(foundValue, { instant: true });
                setScannerHint(`Código detectado: ${foundValue}`);
                setIsScannerOpen(false);
                stopScanner();
                return;
              }
            } catch {
              setScannerErrorMessage(
                'No pudimos leer el código. Reintentá enfocando mejor.',
              );
              setIsScannerOpen(false);
              stopScanner();
              return;
            } finally {
              isDetectingRef.current = false;
            }
          }

          animationFrameRef.current = window.requestAnimationFrame(() => {
            void scanFrame();
          });
        };

        animationFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      } catch {
        setScannerErrorMessage(
          'No pudimos acceder a la cámara. Revisá permisos del navegador.',
        );
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [applyQuery, isScannerOpen, stopScanner]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    let isActive = true;

    if (!branchId || !shouldSearch) {
      return () => {
        isActive = false;
      };
    }

    const term = query.trim();
    const delayMs = instantSearchRef.current ? 0 : SEARCH_DEBOUNCE_MS;
    instantSearchRef.current = false;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const createBaseRequest = () =>
        supabase
          .from('v_pos_product_catalog')
          .select(
            'product_id, name, internal_code, barcode, unit_price, stock_on_hand',
          )
          .eq('org_id', orgId)
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .order('name');

      let resultsByName: ProductLookupRow[] = [];
      let resultsByBarcode: ProductLookupRow[] = [];
      let failedQueries = 0;

      if (queryTokens.length > 0) {
        let nameRequest = createBaseRequest().limit(RESULT_LIMIT);

        for (const token of queryTokens) {
          nameRequest = nameRequest.ilike('name', `%${token}%`);
        }

        const { data, error } = await nameRequest;
        if (!isActive) return;

        if (error) {
          failedQueries += 1;
        } else {
          resultsByName = (data as ProductLookupRow[] | null) ?? [];
        }
      }

      if (term.length > 0) {
        const { data, error } = await createBaseRequest()
          .eq('barcode', term)
          .limit(RESULT_LIMIT);
        if (!isActive) return;

        if (error) {
          failedQueries += 1;
        } else {
          resultsByBarcode = (data as ProductLookupRow[] | null) ?? [];
        }
      }

      const mergedResults = mergeLookupResults(resultsByBarcode, resultsByName);

      if (failedQueries > 0 && mergedResults.length === 0) {
        setErrorMessage(
          'No se pudo buscar productos. Reintentá en unos segundos.',
        );
        setResults([]);
        setIsLoading(false);
        return;
      }

      setResults(mergedResults);
      setIsLoading(false);
    }, delayMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [branchId, orgId, query, queryTokens, shouldSearch, supabase]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Consulta de productos
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Buscá por nombre o código de barras para ver precio y stock en
          segundos.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-1">
            <label
              htmlFor="lookup-branch"
              className="text-xs font-semibold text-zinc-600"
            >
              Sucursal
            </label>
            <select
              id="lookup-branch"
              value={branchId}
              onChange={(event) => handleBranchChange(event.target.value)}
              className="h-11 rounded-lg border border-zinc-300 px-3 text-sm"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label
              htmlFor="lookup-query"
              className="text-xs font-semibold text-zinc-600"
            >
              Producto
            </label>
            <div className="flex gap-2">
              <input
                id="lookup-query"
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Ej: coca 2.25 retornable o 7791234567890"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-base"
              />
              <button
                type="button"
                onClick={isScannerOpen ? closeScanner : openScanner}
                className="h-12 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {canUseCameraScanner
                  ? isScannerOpen
                    ? 'Cerrar cámara'
                    : 'Usar cámara'
                  : 'Ingresar código'}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Podés escribir palabras en cualquier orden o escanear un código de
              barras. Mínimo {SEARCH_MIN_CHARS} caracteres.
            </p>
            {query ? (
              <button
                type="button"
                onClick={handleQueryClear}
                className="w-fit text-xs font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
              >
                Limpiar búsqueda
              </button>
            ) : null}
            {scannerErrorMessage ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {scannerErrorMessage}
              </p>
            ) : null}
            {scannerHint ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                {scannerHint}
              </p>
            ) : null}
            {isScannerOpen ? (
              <div className="overflow-hidden rounded-xl border border-zinc-300 bg-black">
                <video
                  ref={videoRef}
                  className="aspect-video w-full"
                  muted
                  playsInline
                  autoPlay
                />
              </div>
            ) : null}
            {isManualCodeOpen ? (
              <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                <label
                  htmlFor="manual-barcode"
                  className="text-xs font-semibold text-zinc-700"
                >
                  Código de barras
                </label>
                <div className="flex gap-2">
                  <input
                    id="manual-barcode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ej: 7791234567890"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applyManualCode();
                      }
                    }}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyManualCode}
                    className="h-10 shrink-0 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white"
                  >
                    Buscar
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Tu navegador no soporta escaneo por cámara. Podés cargar el
                  código manualmente.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {!shouldSearch ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">
          Empezá escribiendo nombre/código o usá cámara para buscar.
        </p>
      ) : null}

      {isLoading ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">
          Buscando productos...
        </p>
      ) : null}

      {shouldSearch && !isLoading && visibleResults.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
          No encontramos productos con esa búsqueda.
        </p>
      ) : null}

      {visibleResults.length > 0 ? (
        <section className="grid gap-2">
          {visibleResults.map((product) => (
            <article
              key={product.product_id}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {product.internal_code
                      ? `Cod: ${product.internal_code}`
                      : 'Sin código interno'}
                    {product.barcode ? ` · EAN: ${product.barcode}` : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap text-zinc-900">
                  {formatCurrency(Number(product.unit_price ?? 0))}
                </p>
              </div>

              <div className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                Stock: {formatStock(Number(product.stock_on_hand ?? 0))}
              </div>
            </article>
          ))}

          {visibleResults.length >= RESULT_LIMIT ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
              Mostrando hasta {RESULT_LIMIT} resultados. Agregá más palabras
              para afinar.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
