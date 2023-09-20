import { Context } from "netlify:edge";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  const response = await context.next();
  let indexHtmlText = await response.text();

  if (url.searchParams.get("id") === null) {
    return new Response(null, response);
  }

  let invoiceNo: string;

  try {
		invoiceNo = atob(url.searchParams.get("id")!);
  } catch(e) {
    console.log(e);
    return new Response('<!doctype html><html><body>Invoice ID not found.</body></html>', response);
  }

  let sheetId: string = Deno.env.get("GOOGLE_SHEET_ID");
  let sheetKey: string = Deno.env.get("GOOGLE_SHEET_KEY");

  context.log(`Transforming ${url} for name: ${invoiceNo}`);

  // Get all sheet names: https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets%2Fproperties%2Ftitle&key=${sheetKey}
  // From https://stackoverflow.com/questions/55018655/get-all-data-of-multiple-worksheet-in-google-api-in-js
  const jsonResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/2022-2023-T2?key=${sheetKey}`);
  const data = await jsonResponse.json();

  const columnNames = data.values.shift();
  const tokenNames = columnNames.map((item: string) => `{{${item}}}`);
  const invoiceData = data.values;
  let currentInvoice = invoiceData.find((item: string) => item.includes(invoiceNo));

  currentInvoice.length = currentInvoice.length - 3; // Remove the last 3 columns, as they're not used

  currentInvoice.forEach((val: string, idx: string) => (indexHtmlText = indexHtmlText.replaceAll(tokenNames[idx], val)));

  return new Response(indexHtmlText, response);
};