import { Context } from "netlify:edge";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  const response = await context.next();
  let indexHtmlText = await response.text();

	const id = url.searchParams.get("id");
	const sheetName = url.searchParams.get("term");

  if (id === null || sheetName === null) {
		return new Response(null, response);
	} else if (id === '') {
		return new Response("<!doctype html><html><body>Invoice ID is empty.</body></html>", response);
	} else if (sheetName === '') {
		return new Response("<!doctype html><html><body>Term was not provided.</body></html>", response);
	}

  let invoiceNo: string;

  try {
		invoiceNo = atob(id);
  } catch(e) {
    console.log(`Failed to decode base64 for id: ${id}`);
    return new Response(`<!doctype html><html><body>Invoice ID: ${id} is not valid.</body></html>`, response);
  }

  let sheetId: string = Deno.env.get("GOOGLE_SHEET_ID");
  let sheetKey: string = Deno.env.get("GOOGLE_SHEET_KEY");

  context.log(`Transforming ${url} for Invoice No: ${invoiceNo}`);

  // Get all sheet names: https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets%2Fproperties%2Ftitle&key=${sheetKey}
  // From https://stackoverflow.com/questions/55018655/get-all-data-of-multiple-worksheet-in-google-api-in-js
  const jsonResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${sheetKey}`);
  const data = await jsonResponse.json();
	
	if(data?.error) {
		return new Response(`<!doctype html><html><body>Data source not found.</body></html>`, response);
	}
	

  const columnNames = data.values.shift();
  const tokenNames = columnNames.map((item: string) => `{{${item}}}`);
  const invoiceData = data.values;
  let currentInvoice = invoiceData.find((item: string) => item.includes(invoiceNo));

	if(currentInvoice === undefined) {
		return new Response(`<!doctype html><html><body>Invoice ID: ${id} not found.</body></html>`, response);
	}

  currentInvoice.length = currentInvoice.length - 4; // Remove the last 4 columns, as they're not used

  currentInvoice.forEach((val: string, idx: string) => (indexHtmlText = indexHtmlText.replaceAll(tokenNames[idx], val)));

  return new Response(indexHtmlText, response);
};