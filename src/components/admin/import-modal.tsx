import { useState, useRef } from "react";
import {
  downloadExcelTemplate,
  parseUploadedSpreadsheet,
  validateImportBatchServerFn,
  confirmImportBatchServerFn,
  PRESET_COURSES,
  type PreviewValidatedStudent,
  type CoursePreset,
} from "@/lib/certificates";
import {
  downloadBatchCertificatesZipServerFn,
} from "@/lib/certificates";
import { handleBatchZipDownloadResult } from "@/lib/certificates/client-pdf";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = "config" | "upload" | "preview" | "success";

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<WizardStep>("config");
  const [importMode, setImportMode] = useState<"simple" | "complete">("simple");

  // Configuración de capacitación (Modo Simple)
  const [selectedPreset, setSelectedPreset] = useState<CoursePreset>(PRESET_COURSES[0]);
  const [customCourseName, setCustomCourseName] = useState(PRESET_COURSES[0].name);
  const [customCourseCode, setCustomCourseCode] = useState(PRESET_COURSES[0].code);
  const [customHours, setCustomHours] = useState(PRESET_COURSES[0].defaultHours);
  const [customPeriod, setCustomPeriod] = useState(PRESET_COURSES[0].defaultPeriod);
  const [customIssueDate, setCustomIssueDate] = useState(PRESET_COURSES[0].defaultIssueDate);

  // Archivo y parseo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ row: number; field: string; problem: string }[]>([]);

  // Previsualización y validación del servidor
  const [previewItems, setPreviewItems] = useState<PreviewValidatedStudent[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Proceso de guardado e importación
  const [isSaving, setIsSaving] = useState(false);
  const [importedBatch, setImportedBatch] = useState<{
    batchId: string;
    insertedCount: number;
    skippedCount: number;
    certificates: string[];
  } | null>(null);

  // Generación de PDFs y progreso
  const [isGeneratingPdfs, setIsGeneratingPdfs] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: CoursePreset) => {
    setSelectedPreset(preset);
    setCustomCourseName(preset.name);
    setCustomCourseCode(preset.code);
    setCustomHours(preset.defaultHours);
    setCustomPeriod(preset.defaultPeriod);
    setCustomIssueDate(preset.defaultIssueDate);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsValidating(true);
    setValidationErrors([]);

    try {
      const buffer = await file.arrayBuffer();
      const parseResult = parseUploadedSpreadsheet(buffer);

      if (parseResult.errors.length > 0) {
        setValidationErrors(parseResult.errors);
        setIsValidating(false);
        return;
      }

      if (parseResult.rows.length === 0) {
        setValidationErrors([{ row: 0, field: "Archivo", problem: "No se encontraron filas con datos de alumnos." }]);
        setIsValidating(false);
        return;
      }

      // Validar contra la base de datos y obtener códigos correlativos
      const serverValidation = await validateImportBatchServerFn({
        data: {
          students: parseResult.rows.map((r) => ({
            nombre: r.nombre,
            apellido: r.apellido,
            dni: r.dni,
            curso: importMode === "complete" ? r.curso : undefined,
            horas: importMode === "complete" ? r.horas : undefined,
            periodo: importMode === "complete" ? r.periodo : undefined,
            fechaEmision: importMode === "complete" ? r.fechaEmision : undefined,
          })),
          defaultCourse:
            importMode === "simple"
              ? {
                  name: customCourseName,
                  code: customCourseCode,
                  hours: customHours,
                  period: customPeriod,
                  issueDate: customIssueDate,
                }
              : undefined,
        },
      });

      setPreviewItems(serverValidation.items);
      setDuplicateCount(serverValidation.duplicateDniInDbCount);

      if (!serverValidation.valid) {
        const errors: { row: number; field: string; problem: string }[] = [];
        serverValidation.items.forEach((item) => {
          item.errors.forEach((err) => {
            errors.push({ row: item.rowNumber, field: "Datos", problem: err });
          });
        });
        setValidationErrors(errors);
      }

      setStep("preview");
    } catch (err: any) {
      console.error("Error al procesar archivo:", err);
      setValidationErrors([
        { row: 0, field: "Archivo", problem: err?.message || "No se pudo leer el archivo. Verificá que sea .xlsx o .csv válido." },
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsSaving(true);
    try {
      const res = await confirmImportBatchServerFn({
        data: {
          items: previewItems,
          options: { skipDuplicates },
        },
      });

      setImportedBatch(res);
      setStep("success");
      onSuccess();
    } catch (err: any) {
      console.error("Error al confirmar importación:", err);
      alert(`Error al guardar los certificados: ${err?.message || "Intente nuevamente."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateZip = async () => {
    if (!importedBatch?.certificates?.length) return;
    setIsGeneratingPdfs(true);
    setGenerationProgress({ current: 0, total: importedBatch.certificates.length });

    try {
      const res = await downloadBatchCertificatesZipServerFn({
        data: { codes: importedBatch.certificates },
      });
      await handleBatchZipDownloadResult(res);
      setGenerationProgress({ current: importedBatch.certificates.length, total: importedBatch.certificates.length });
    } catch (err: any) {
      console.error("Error al generar lote ZIP:", err);
      alert(`Error al generar ZIP: ${err?.message || "Intente nuevamente."}`);
    } finally {
      setIsGeneratingPdfs(false);
    }
  };

  const resetAll = () => {
    setStep("config");
    setSelectedFileName(null);
    setValidationErrors([]);
    setPreviewItems([]);
    setDuplicateCount(0);
    setImportedBatch(null);
    setGenerationProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-bg border border-border rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-subtle/30">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-primary">// IMPORTACIÓN MASIVA</span>
            <span className="text-xs text-muted">| Generador de Certificados</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-fg font-mono text-sm px-2 py-1 rounded hover:bg-subtle transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Pasos / Breadcrumb */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-subtle/10 font-mono text-micro text-muted">
          <div className={`flex items-center gap-2 ${step === "config" ? "text-primary font-bold" : ""}`}>
            <span className="size-4 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
            <span>MODALIDAD Y CURSO</span>
          </div>
          <span className="text-subtle">→</span>
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-primary font-bold" : ""}`}>
            <span className="size-4 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
            <span>SUBIR ARCHIVO</span>
          </div>
          <span className="text-subtle">→</span>
          <div className={`flex items-center gap-2 ${step === "preview" ? "text-primary font-bold" : ""}`}>
            <span className="size-4 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
            <span>REVISAR Y CONFIRMAR</span>
          </div>
          <span className="text-subtle">→</span>
          <div className={`flex items-center gap-2 ${step === "success" ? "text-primary font-bold" : ""}`}>
            <span className="size-4 rounded-full border border-current flex items-center justify-center text-[10px]">4</span>
            <span>DESCARGA</span>
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div className="p-6">
          {/* PASO 1: CONFIGURACIÓN */}
          {step === "config" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-fg tracking-wide font-mono uppercase mb-1">
                  1. Seleccionar Modalidad de Importación
                </h3>
                <p className="text-xs text-muted">
                  Elegí si los datos de la capacitación aplican a toda la lista o si cada fila del archivo define su propio curso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setImportMode("simple")}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    importMode === "simple"
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-subtle/20 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-fg">OPCIÓN A: IMPORTACIÓN SIMPLE</span>
                    {importMode === "simple" && <span className="size-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Ideal para una tanda de la misma capacitación. El archivo solo necesita columnas:{" "}
                    <strong className="text-fg">Nombre, Apellido, DNI</strong>.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("complete")}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    importMode === "complete"
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-subtle/20 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-fg">OPCIÓN B: IMPORTACIÓN COMPLETA</span>
                    {importMode === "complete" && <span className="size-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    El archivo contiene columnas individuales para cada alumno:{" "}
                    <strong className="text-fg">Nombre, Apellido, DNI, Curso, Horas, Periodo, FechaEmision</strong>.
                  </p>
                </button>
              </div>

              {importMode === "simple" && (
                <div className="p-5 border border-border rounded-lg bg-subtle/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono text-xs font-bold text-fg uppercase">Datos de la Capacitación para el Lote</h4>
                    <span className="text-micro font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                      // {customCourseCode}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PRESET_COURSES.map((preset) => (
                      <button
                        key={preset.code}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`font-mono text-micro px-3 py-1.5 rounded border transition-colors ${
                          selectedPreset.code === preset.code
                            ? "border-primary bg-primary/20 text-fg font-bold"
                            : "border-border text-muted hover:text-fg hover:border-border/80"
                        }`}
                      >
                        {preset.name} ({preset.code})
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block font-mono text-micro text-muted uppercase mb-1">Nombre del Curso</label>
                      <input
                        type="text"
                        value={customCourseName}
                        onChange={(e) => setCustomCourseName(e.target.value)}
                        className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-micro text-muted uppercase mb-1">
                        Código Abreviado (courseCode)
                      </label>
                      <input
                        type="text"
                        value={customCourseCode}
                        onChange={(e) => setCustomCourseCode(e.target.value.toUpperCase())}
                        className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-fg font-mono uppercase focus:outline-none focus:border-primary"
                        placeholder="Ej. PYVC"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-micro text-muted uppercase mb-1">Duración (Horas)</label>
                      <input
                        type="number"
                        value={customHours}
                        onChange={(e) => setCustomHours(Number(e.target.value))}
                        className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-micro text-muted uppercase mb-1">Periodo de Cursada</label>
                      <input
                        type="text"
                        value={customPeriod}
                        onChange={(e) => setCustomPeriod(e.target.value)}
                        className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary"
                        placeholder="Ej. abril – julio 2026"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-mono text-micro text-muted uppercase mb-1">Fecha de Emisión</label>
                      <input
                        type="date"
                        value={customIssueDate}
                        onChange={(e) => setCustomIssueDate(e.target.value)}
                        className="w-full md:w-1/2 bg-bg border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="font-mono text-xs px-4 py-2 text-muted hover:text-fg transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="font-mono text-xs px-5 py-2.5 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors shadow"
                >
                  CONTINUAR AL PASO 2 →
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: SUBIR ARCHIVO */}
          {step === "upload" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-fg tracking-wide font-mono uppercase mb-1">
                    2. Cargar Archivo de Alumnos (.xlsx / .csv)
                  </h3>
                  <p className="text-xs text-muted">
                    {importMode === "simple"
                      ? "Columnas requeridas: Nombre, Apellido, DNI."
                      : "Columnas requeridas: Nombre, Apellido, DNI, Curso, Horas, Periodo, FechaEmision."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => downloadExcelTemplate(importMode)}
                  className="inline-flex items-center gap-2 font-mono text-xs px-3.5 py-2 border border-primary/40 text-primary bg-primary/5 hover:bg-primary/15 rounded transition-colors"
                  title="Descargar archivo Excel con formato de ejemplo"
                >
                  <span>⬇</span>
                  <span>DESCARGAR PLANTILLA ({importMode === "simple" ? "SIMPLE" : "COMPLETA"})</span>
                </button>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer bg-subtle/10 hover:bg-subtle/25 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="space-y-3">
                  <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl font-mono">
                    📁
                  </div>
                  <div>
                    <p className="text-xs font-bold text-fg font-mono uppercase">
                      Hacé click para seleccionar o arrastrá el archivo aquí
                    </p>
                    <p className="text-micro text-muted font-mono mt-1">Formatos soportados: .xlsx, .xls, .csv (Hasta 1.000 filas)</p>
                  </div>
                  {selectedFileName && (
                    <div className="inline-block bg-primary/20 text-primary font-mono text-xs px-3 py-1 rounded">
                      Archivo seleccionado: {selectedFileName}
                    </div>
                  )}
                </div>
              </div>

              {/* Errores de validación inicial */}
              {validationErrors.length > 0 && (
                <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase">
                    <span>⚠</span>
                    <span>Se encontraron {validationErrors.length} problema(s) en el archivo:</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {validationErrors.map((err, idx) => (
                      <div key={idx} className="font-mono text-micro text-red-300 flex gap-2">
                        <span className="text-subtle font-bold">Fila {err.row || "—"}:</span>
                        <span className="text-red-200">[{err.field}]</span>
                        <span>{err.problem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isValidating && (
                <div className="flex items-center justify-center gap-3 py-4 font-mono text-xs text-primary">
                  <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span>Validando datos y verificando duplicados...</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep("config")}
                  className="font-mono text-xs px-4 py-2 text-muted hover:text-fg transition-colors"
                >
                  ← VOLVER AL PASO 1
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: PREVISUALIZACIÓN */}
          {step === "preview" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-fg tracking-wide font-mono uppercase">
                    3. Previsualización y Asignación de Códigos
                  </h3>
                  <p className="text-xs text-muted">
                    Revisá la lista antes de guardar. Se asignaron códigos correlativos automáticos a partir del último registro.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded">
                    Total: {previewItems.length} alumnos
                  </span>
                </div>
              </div>

              {/* Advertencia de duplicados en DB */}
              {duplicateCount > 0 && (
                <div className="p-3.5 border border-amber-500/40 rounded-lg bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs">
                    <span>⚠</span>
                    <span>
                      <strong>{duplicateCount} alumno(s)</strong> ya poseen un certificado emitido para este curso en la base de datos.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 font-mono text-micro text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-amber-500/50 text-primary focus:ring-0"
                    />
                    <span>Omitir duplicados existentes</span>
                  </label>
                </div>
              )}

              {/* Tabla de previsualización */}
              <div className="border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left font-mono text-micro border-collapse">
                  <thead className="bg-subtle/40 sticky top-0 z-10 border-b border-border text-muted">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">ALUMNO</th>
                      <th className="p-2.5">DNI</th>
                      <th className="p-2.5">CURSO</th>
                      <th className="p-2.5">HS</th>
                      <th className="p-2.5">CÓDIGO ASIGNADO</th>
                      <th className="p-2.5">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {previewItems.map((item) => (
                      <tr
                        key={item.rowNumber}
                        className={`hover:bg-subtle/20 ${item.alreadyExistsInDb ? "bg-amber-500/5" : ""}`}
                      >
                        <td className="p-2.5 text-muted">{item.rowNumber}</td>
                        <td className="p-2.5 font-bold text-fg">{item.participantName}</td>
                        <td className="p-2.5 text-muted">{item.dni}</td>
                        <td className="p-2.5 text-muted max-w-[180px] truncate" title={item.courseName}>
                          {item.courseName}
                        </td>
                        <td className="p-2.5 text-muted">{item.hours}h</td>
                        <td className="p-2.5 font-bold text-primary">{item.assignedCode}</td>
                        <td className="p-2.5">
                          {item.alreadyExistsInDb ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                              {skipDuplicates ? "Se omitirá (Ya existe)" : "Se sobrescribirá"}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                              Listo para emitir
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="font-mono text-xs px-4 py-2 text-muted hover:text-fg transition-colors"
                >
                  ← CAMBIAR ARCHIVO
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="font-mono text-xs px-4 py-2 text-muted hover:text-fg transition-colors"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isSaving}
                    className="font-mono text-xs px-6 py-2.5 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors shadow disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <span className="size-3 rounded-full border-2 border-black border-t-transparent animate-spin" />}
                    <span>CONFIRMAR IMPORTACIÓN ({skipDuplicates ? previewItems.length - duplicateCount : previewItems.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: ÉXITO Y GENERACIÓN MASIVA */}
          {step === "success" && importedBatch && (
            <div className="space-y-6 text-center py-4">
              <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-mono">
                ✓
              </div>

              <div>
                <h3 className="text-lg font-bold text-fg font-mono uppercase">
                  {importedBatch.insertedCount} Certificados Importados Correctamente
                </h3>
                <p className="text-xs text-muted font-mono mt-1">
                  Lote: <strong className="text-primary">{importedBatch.batchId}</strong>
                  {importedBatch.skippedCount > 0 && ` · (${importedBatch.skippedCount} omitidos por duplicación)`}
                </p>
              </div>

              {/* Tarjeta de generación de PDFs */}
              <div className="p-6 border border-border rounded-xl bg-subtle/20 max-w-md mx-auto space-y-4 text-left">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-fg uppercase">
                  <span>📄</span>
                  <span>Generación y Descarga de Certificados</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Podés generar y descargar todos los certificados del lote en un único archivo ZIP comprimido de alta resolución.
                </p>

                {generationProgress && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between font-mono text-micro text-muted">
                      <span>Procesando certificados:</span>
                      <span className="text-primary font-bold">
                        {generationProgress.current} / {generationProgress.total}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${Math.round((generationProgress.current / generationProgress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateZip}
                  disabled={isGeneratingPdfs}
                  className="w-full py-3 bg-primary text-black font-bold font-mono text-xs rounded hover:bg-primary/90 transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingPdfs && (
                    <span className="size-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  )}
                  <span>{isGeneratingPdfs ? "GENERANDO ARCHIVOS PDF..." : "DESCARGAR LOTE EN ZIP 📦"}</span>
                </button>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleClose}
                  className="font-mono text-xs px-6 py-2.5 bg-subtle hover:bg-subtle/80 text-fg rounded transition-colors"
                >
                  CERRAR Y VER LISTADO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
