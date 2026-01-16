import { NextResponse } from "next/server";
import { existsSync, readdirSync } from "fs";
import path from "path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    const uploadDir = "/home/mounir/images";

    const result = {
      uploadDir,
      dirExists: false,
      files: [],
      totalFiles: 0,
      message: "",
    };

    result.dirExists = existsSync(uploadDir);

    if (result.dirExists) {
      result.files = readdirSync(uploadDir);
      result.totalFiles = result.files.length;
      result.message = `${result.totalFiles} ملف في المجلد`;

      if (fileName) {
        const filePath = path.join(uploadDir, fileName);
        result.fileExists = existsSync(filePath);
        result.filePath = filePath;
        result.publicUrl = `https://www.royakids.shop/images/${fileName}`;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
