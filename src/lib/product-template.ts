import { z } from "zod";

export const templateConfigurationSchema = z.object({
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  title: z.string().trim().min(3).max(45),
  introduction: z.string().trim().min(3).max(120),
  accomplishment: z.string().trim().min(3).max(180),
  footer: z.string().trim().max(120),
});

export type TemplateConfiguration = z.infer<typeof templateConfigurationSchema>;

export const DEFAULT_TEMPLATE: TemplateConfiguration = {
  accentColor: "#2A5070",
  title: "CERTIFICADO",
  introduction: "Se certifica que",
  accomplishment: "participó y cumplió los requisitos de la capacitación",
  footer: "",
};

/** Old empty configs use these defaults; stored versions are never edited. */
export function readTemplateConfiguration(value: unknown): TemplateConfiguration {
  const parsed = templateConfigurationSchema.partial().safeParse(value);
  return parsed.success ? { ...DEFAULT_TEMPLATE, ...parsed.data } : DEFAULT_TEMPLATE;
}
