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
		return new Response("Invoice ID is empty", response);
	} else if (sheetName === '') {
		return new Response("Term was not provided", response);
	}

  let invoiceNo: string;

  try {
		invoiceNo = atob(id);
  } catch(e) {
    console.log(`Failed to decode base64 for id: ${id}`);
    return new Response(`Invoice ID: ${id} is not valid`, response);
  }

	// Validate invoice number format against SF##-#### (# = number)
	if (!invoiceNo.match(/SF\d{2}-\d{4}$/)) {
		return new Response(`Unrecognised Invoice No. format`, response);
	}

  let sheetId: string = Deno.env.get("GOOGLE_SHEET_ID");
  let sheetKey: string = Deno.env.get("GOOGLE_SHEET_KEY");

  context.log(`Transforming ${url} for Invoice No: ${invoiceNo}`);

  // Get all sheet names: https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets%2Fproperties%2Ftitle&key=${sheetKey}
  // From https://stackoverflow.com/questions/55018655/get-all-data-of-multiple-worksheet-in-google-api-in-js
  const jsonResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${sheetKey}`);
  const data = await jsonResponse.json();
	
	if(data?.error) {
		return new Response(`Data source not found`, response);
	}
	

  const columnNames = data.values.shift();
  const tokenNames = columnNames.map((item: string) => `{{${item}}}`);
  const invoiceData = data.values;
  let currentInvoice = invoiceData.find((item: string) => item.includes(invoiceNo));
	
	if(currentInvoice === undefined) {
		return new Response(`Invoice ID: ${id} not found`, response);
	}

  currentInvoice.forEach((val: string, idx: string) => (indexHtmlText = indexHtmlText.replaceAll(tokenNames[idx], val)));
  indexHtmlText = indexHtmlText.replaceAll("{{Term}}", sheetName); // Term comes from the URL instead of spreadsheet

  return new Response(indexHtmlText, response);
};