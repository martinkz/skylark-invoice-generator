import { Context } from "netlify:edge";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  const response = await context.next();
  let text = await response.text();

  if (url.searchParams.get("id") === null) {
    return new Response(null, response);
  }

  let invoiceName: string;

  try {
    invoiceName = atob(url.searchParams.get("id")!);
  } catch(e) {
    console.log(e);
    return new Response('<!doctype html><html><body>Invoice ID not found.</body></html>', response);
  }

  context.log(`Transforming ${url} for name: ${invoiceName}`);

  const jsonResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1oQronS_Sq679Oy1DAXL3A7xgDb0MrYbixRx8m6Su08o/values/2022-2023-T1?key=AIzaSyAsaZWn7_HcXpR69f_wKRaSX1dQXwwlOxg");
  const data = await jsonResponse.json();

  const columnNames = data.values.shift();
  const tokenNames = columnNames.map((item: string) => `{{${item}}}`);
  const invoiceData = data.values;
  let currentInvoice = invoiceData.find((item: string) => item.includes(invoiceName));

  currentInvoice.length = currentInvoice.length - 3; // Remove the last 3 columns, as they're not used

  currentInvoice.forEach( (val: string, idx: string) =>  text = text.replaceAll(tokenNames[idx], val) );

  return new Response(text, response);
};