declare module "mammoth/mammoth.browser" {
  export type MammothMessage = { type: string; message: string; error?: unknown };
  export type MammothResult = { value: string; messages: MammothMessage[] };
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: Record<string, unknown>): Promise<MammothResult>;
}
