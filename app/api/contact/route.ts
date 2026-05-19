import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFileSize = 20 * 1024 * 1024;
const maxTextLength = 3000;
const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg", "zip", "doc", "docx"]);
const allowedMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
]);

type TelegramResponse = {
  description?: string;
  ok: boolean;
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getTextList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "type" in value &&
    "arrayBuffer" in value
  );
}

function getExtension(fileName: string) {
  const extension = fileName.split(".").pop();

  return extension ? extension.toLowerCase() : "";
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatValue(value: string) {
  return escapeTelegramHtml(value || "Not specified");
}

function formatList(values: string[]) {
  if (!values.length) {
    return "Not specified";
  }

  return values.map((value) => `• ${escapeTelegramHtml(value)}`).join("\n");
}

function validateText(value: string, label: string) {
  if (value.length > maxTextLength) {
    return `${label} is too long. Please keep it under ${maxTextLength} characters.`;
  }

  return null;
}

function validateEmail(email: string) {
  if (!email) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? null
    : "Please enter a valid email address.";
}

function validateFile(file: File) {
  const extension = getExtension(file.name);
  const type = file.type.toLowerCase();

  if (file.size > maxFileSize) {
    return `${file.name} is larger than 20MB.`;
  }

  if (!allowedExtensions.has(extension)) {
    return `${file.name} has an unsupported file type.`;
  }

  if (type && !allowedMimeTypes.has(type)) {
    return `${file.name} has an unsupported file type.`;
  }

  return null;
}

function buildMessage({
  budget,
  company,
  email,
  files,
  name,
  phone,
  services,
  task,
}: {
  budget: string;
  company: string;
  email: string;
  files: File[];
  name: string;
  phone: string;
  services: string[];
  task: string;
}) {
  return [
    "✨ <b>NEW WEBSITE LEAD</b>",
    "",
    `👤 <b>Name:</b> ${formatValue(name)}`,
    `🏢 <b>Company:</b> ${formatValue(company)}`,
    `📧 <b>Email:</b> ${formatValue(email)}`,
    `📱 <b>Phone:</b> ${formatValue(phone)}`,
    "",
    "🛠 <b>Services:</b>",
    formatList(services),
    "",
    `💰 <b>Budget:</b>\n${formatValue(budget)}`,
    "",
    `💬 <b>Task:</b>\n${formatValue(task)}`,
    "",
    `📎 <b>Files:</b>\n${files.length ? `${files.length} attached` : "No files"}`,
    "",
    "🌍 studio.1331.agency",
  ].join("\n");
}

async function sendTelegramRequest(endpoint: string, body: BodyInit, contentType?: string) {
  const token = process.env.TG_BOT_TOKEN;

  if (!token) {
    throw new Error("Telegram bot token is not configured.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
  const result = await response.json().catch(() => null) as TelegramResponse | null;

  if (!response.ok || result?.ok === false) {
    throw new Error(result?.description ?? "Telegram request failed.");
  }
}

async function sendLeadMessage(chatId: string, text: string) {
  await sendTelegramRequest(
    "sendMessage",
    JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      parse_mode: "HTML",
      text,
    }),
    "application/json",
  );
}

async function sendLeadFile(chatId: string, file: File, index: number, total: number) {
  const formData = new FormData();

  formData.append("chat_id", chatId);
  formData.append("caption", `Website lead attachment ${index + 1}/${total}`);
  formData.append("document", file, file.name);

  await sendTelegramRequest("sendDocument", formData);
}

export async function POST(request: Request) {
  try {
    const chatId = process.env.TG_CHAT_ID;

    if (!process.env.TG_BOT_TOKEN || !chatId) {
      return NextResponse.json(
        { error: "Telegram notifications are not configured." },
        { status: 500 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Request must use multipart/form-data." },
        { status: 415 },
      );
    }

    const formData = await request.formData();
    const services = getTextList(formData, "services");
    const budget = getText(formData, "budget");
    const task = getText(formData, "task");
    const name = getText(formData, "name");
    const company = getText(formData, "company");
    const email = getText(formData, "email");
    const phone = getText(formData, "phone");
    const files = formData
      .getAll("files")
      .filter(isUploadedFile)
      .filter((file) => file.size > 0);

    const textValidationError = [
      validateText(name, "Name"),
      validateText(company, "Company"),
      validateText(email, "Email"),
      validateText(phone, "Phone"),
      validateText(task, "Task"),
      validateEmail(email),
    ].find(Boolean);

    if (textValidationError) {
      return NextResponse.json({ error: textValidationError }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Please add email or phone so we can contact you." },
        { status: 400 },
      );
    }

    const fileValidationError = files.map(validateFile).find(Boolean);

    if (fileValidationError) {
      return NextResponse.json({ error: fileValidationError }, { status: 400 });
    }

    await sendLeadMessage(chatId, buildMessage({
      budget,
      company,
      email,
      files,
      name,
      phone,
      services,
      task,
    }));

    for (let index = 0; index < files.length; index += 1) {
      await sendLeadFile(chatId, files[index], index, files.length);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error", error);

    return NextResponse.json(
      { error: "Could not send the request. Please try again." },
      { status: 502 },
    );
  }
}
