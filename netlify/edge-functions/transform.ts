import { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Look for the query parameter, and return if we don't find it
  if (url.searchParams.get("id") === null) {
    return;
  }

  let invoiceName = atob(url.searchParams.get("id"));

  context.log(`Transforming the response from this ${url} for name: ${invoiceName}`);

  const jsonResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1oQronS_Sq679Oy1DAXL3A7xgDb0MrYbixRx8m6Su08o/values/2022-2023-T1?key=AIzaSyAsaZWn7_HcXpR69f_wKRaSX1dQXwwlOxg");
  const data = await jsonResponse.json();

  const columnNames = data.values.shift();
  const tokenNames = columnNames.map(item => `{{${item}}}`);
  const invoiceData = data.values;

  // console.log(invoiceData);

  let currentInvoice = invoiceData.find(item => item.includes(invoiceName));

  currentInvoice.length = currentInvoice.length - 3; // Remove the last 3 columns, as they're not used

  // console.log(columnNames, currentInvoice);

  const response = await context.next();
  let text = await response.text();

  currentInvoice.forEach( (val,idx) =>  text = text.replaceAll(tokenNames[idx], val) );

  return new Response(text, response);
};