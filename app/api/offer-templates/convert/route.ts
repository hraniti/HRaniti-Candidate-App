import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return new NextResponse("No Word file provided.", { status: 400 });
    if (!file.name.toLowerCase().endsWith(".docx")) return new NextResponse("Only .docx files are supported.", { status: 400 });
    if (file.size > 10 * 1024 * 1024) return new NextResponse("The Word template must be 10 MB or smaller.", { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h2:fresh",
        "p[style-name='Heading 2'] => h3:fresh"
      ]
    });

    return NextResponse.json({ html: result.value, warnings: result.messages });
  } catch (error) {
    console.error("offer template conversion failed", error);
    return new NextResponse("We could not read that Word template.", { status: 500 });
  }
}
