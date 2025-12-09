const numberToWords = require("number-to-words");
const fs = require("fs");
const moment = require("moment");
// const html_to_pdf = require("html-pdf-node");
const Handlebars = require("handlebars");

// Read HTML Template
const html = fs.readFileSync("assets/templates/newInvoice.hbs", "utf8");
const template = Handlebars.compile(html);
const PdfPrinter = require("pdfmake");
const { datacatalog } = require("googleapis/build/src/apis/datacatalog");
exports.createBillPDF = async (invoiceData, storeInfo) => {
  console.log("......whole  invoiceData.....", invoiceData);
  console.log("......whole  storeInfo.....", storeInfo);
  const customerData = invoiceData.customerData[0];
  const billInvoiceData = invoiceData.billInvoiceData[0];
  const productData = invoiceData.productData[0];

  const data = {
    // storeName: storeInfo.name || "Lovoj Technology PVT LTD.",
    storeName: storeInfo.shopName || "ShopName",
    storeGst: "GSTIN123",
    // shopName: storeInfo.shopName || "StoreName",
    // storeAddress: storeInfo.shopName ? storeInfo.shopName.split(",") : "",
    storeAddress: storeInfo.storeAddress
      ? storeInfo.storeAddress.split(",")
      : "",
    // storelogo: "https://lovoj.s3.amazonaws.com/uploads/QuickOrderImages/1706787696536.png",
    signature:
      storeInfo.storeSignature ||
      "https://p2.hiclipart.com/preview/260/355/759/book-drawing-signature-autograph-artist-singer-actor-celebrity-songwriter-png-clipart.jpg",
    invoiceNo: billInvoiceData.CustomersSection[0].InvoiceNumber,
    invoiceDate: moment(billInvoiceData.createdAt).format("MM/DD/YYYY"),
    deliveryDate: moment(billInvoiceData.CoastSection[0].DeliveryDate).format(
      "MM/DD/YYYY"
    ),
    alterationDate: moment(
      billInvoiceData.CoastSection[0].AlternationDate
    ).format("MM/DD/YYYY"),
    customerName: customerData.name,
    placeOfSupply:
      billInvoiceData.CustomersSection[0].placeOfSupply || "Delhi(07)",
    billAddress: billInvoiceData.CustomersSection[0].BillingAddress.split(","),
    shipAddress: billInvoiceData.CustomersSection[0].ShippingAddress.split(","),
    billgst: billInvoiceData.CoastSection[0].Cgst,
    shipgst: billInvoiceData.CoastSection[0].Sgst,
    products: productData.product.map((product, index) => ({
      no: (index + 1).toString(),
      image: product.fabricImage,
      name: product.name,
      hsnsac: "998822",
      qty: product.fabricQuantity.toString(),
      rate: "1400.0",
      discount: "0.00",
      cgs: "9%",
      cgst: "126",
      sgs: "9%",
      sgst: "126",
      isgst: "0",
      amount: "1647",
    })),

    subTotal: billInvoiceData.CoastSection[0].SubTotal,
    delivery: billInvoiceData.CoastSection[0].DeliveryCharges,
    coupon: billInvoiceData.CoastSection[0].CouponAmount,
    cgst: billInvoiceData.CoastSection[0].Cgst,
    sgst: billInvoiceData.CoastSection[0].Sgst,
    total: billInvoiceData.CoastSection[0].TotalAmount,
    advance: billInvoiceData.CoastSection[0].PaymentAdvance,
    pending: billInvoiceData.CoastSection[0].PendingAmount,
    totalinWords: numberToWords.toWords(
      billInvoiceData.CoastSection[0].TotalAmount
    ),
  };

  // Generate PDF and return file path
  const filePath = await createPdf(data);
  return filePath;
};

const createPdf = async (data) => {
  return new Promise((resolve, reject) => {
    const templateContent = template(data);
    const filePath = `assets/bill_${moment().format("DDMMYYYY_HHmmss")}.pdf`;

    const options = {
      format: "A4",
      path: filePath,
      landscape: false,
      border: "10mm",
      timeout: "10000000",
      headerTemplate: `<img src="https://lovoj.s3.amazonaws.com/uploads/QuickOrderImages/1706787696536.png" style="max-width: 100px; margin-left: auto; display: block;" />`,
      footerTemplate:
        '<span style="color: #444;font-size: 10px;margin-top:6px">This Certificate is only valid if it bears the signature of the Coverholder, on behalf of Novus Underwriting Limited.</span>', // fallback value
    };
    const document = {
      content: templateContent,
    };

    // html_to_pdf
    //     .generatePdf(document, options)
    //     .then((pdfBuffer) => {
    //         // console.log("content", pdfBuffer);
    //         // const pdfBuffer = fs.readFileSync(
    //         //   `assets/pdfs/membership_certificate${data.policyNumber}.pdf`
    //         // );
    //         const base64FileMembershipCertificate = pdfBuffer.toString("base64");
    //         console.log("===== pdf generated =====")
    //         // resolve(base64FileMembershipCertificate);
    //         resolve(filePath)
    //     })
    //     .catch((error) => {
    //         console.log("=====error in pdf generation=====", error)
    //         reject(error);
    //     });
  });
};

// const products = [
//   {
//     no: "1",
//     image: "path/to/image1.jpg",
//     name: "Product 1",
//     hsnsac: "998822",
//     qty: "2",
//     rate: "1400.0",
//     discount: "0.00",
//     cgs: "9%",
//     cgst: "126",
//     sgs: "9%",
//     sgst: "126",
//     isgst: "0",
//     amount: "1647",
//   },
//   {
//     no: "2",
//     image: "path/to/image2.jpg",
//     name: "Product 2",
//     hsnsac: "998822",
//     qty: "3",
//     rate: "1200.0",
//     discount: "0.00",
//     cgs: "9%",
//     cgst: "108",
//     sgs: "9%",
//     sgst: "108",
//     isgst: "0",
//     amount: "1440",
//   },
// ];

exports.generatePdfStream = async (data) => {
  // Define fonts
  const fonts = {
    Roboto: {
      normal: "./assets/pdf/Roboto-Medium.ttf", // Optional, used for browser; for Node, use system fonts or
      bold: "./assets/pdf/Roboto-Medium.ttf",
      italics: "./assets/pdf/Roboto-Medium.ttf",
      bolditalics: "./assets/pdf/Roboto-Medium.ttf",
    },
  };

  const printer = new PdfPrinter(fonts);

  // Define your document
  // var dd = {
  //     content: [
  //         {
  //             table: {
  //                 widths: ['*'],
  //                 body: [
  //                     [
  //                         {
  //                             stack: [
  //                                 {
  //                                     columns: [
  //                                         // Left: Logo
  //                                         {
  //                                             width: '70%',
  //                                             stack: [
  //                                                 {
  //                                                     image: `data:image/png;base64,${data.seller.store_logo}`,
  //                                                     width: 70,
  //                                                     height: 70,
  //                                                     margin: [0, 30, 0, 0]
  //                                                 }
  //                                             ]
  //                                         },
  //                                         // Center: Company Name & Address
  //                                         {
  //                                             margin: [-250,30,0,0],
  //                                             width: '55%',
  //                                             stack: [
  //                                                 {
  //                                                     text: `${data.seller.name}`,
  //                                                     style: 'header',
  //                                                     alignment: 'left',
  //                                                     margin: [0, 0, 0, 5]
  //                                                 },
  //                                                 {
  //                                                     text: [
  //                                                         `${data.store_address}\n`,
  //                                                         `GSTIN: ${data.seller.gstin}`
  //                                                     ],
  //                                                     style: 'companyAddress',
  //                                                     alignment: 'left',
  //                                                     margin: [0, 0, 0, 0]
  //                                                 }
  //                                             ]
  //                                         },
  //                                         // Right: TAX INVOICE bottom-aligned
  //                                         {
  //                                             width: '20%',
  //                                             stack: [
  //                                                 {
  //                                                     text: 'TAX INVOICE',
  //                                                     style: 'invoiceTitle',
  //                                                     alignment: 'right',
  //                                                     margin: [0, 85, 0, 0]
  //                                                 }
  //                                             ]
  //                                         }
  //                                     ],
  //                                     columnGap: 10,
  //                                     margin: [0, 0, 0, 0]
  //                                 },
  //                                 {
  //                                     table: {
  //                                         widths: ['60%', '1%', '39%'],
  //                                         body: [
  //                                             [
  //                                                 // Left column table
  //                                                 {
  //                                                     table: {
  //                                                         widths: ['40%', '60%'],
  //                                                         body: [
  //                                                             ['Invoice No.', `:${data.invoiceNumber}`],
  //                                                             ['Invoice Date', `:${data.invoiceDate}`],
  //                                                             ['Delivery Date', `:${data.deliveryDate}`],
  //                                                             ['Trial Date', `:${data.trialDate}`]
  //                                                         ]
  //                                                     },
  //                                                     layout: {
  //                                                         hLineWidth: () => 0,
  //                                                         vLineWidth: () => 0
  //                                                     }
  //                                                 },
  //                                                 // Middle border column (just empty)
  //                                                 '',
  //                                                 // Right column table
  //                                                 {
  //                                                     table: {
  //                                                         body: [
  //                                                             [
  //                                                                 {
  //                                                                     text: `Order Number      : ${data.orderNumber}`,
  //                                                                     alignment: 'left',
  //                                                                     margin: [0, 0, 0, 0]
  //                                                                 }
  //                                                             ],
  //                                                             [
  //                                                                 {
  //                                                                     text: `Place of Supply    : ${data.placeOfSupply}`,
  //                                                                     alignment: 'left',
  //                                                                     margin: [0, 0, 0, 0]
  //                                                                 }
  //                                                             ],
  //                                                             [
  //                                                                 {
  //                                                                     text: 'Payment Terms:    : {{}}',
  //                                                                     alignment: 'left',
  //                                                                     margin: [0, 0, 0, 0]
  //                                                                 }
  //                                                             ],
  //                                                             [
  //                                                                 {
  //                                                                     text: 'Eway Bill & Date    : {{}}',
  //                                                                     alignment: 'left',
  //                                                                     margin: [0, 0, 0, 0]
  //                                                                 }
  //                                                             ],
  //                                                         ]
  //                                                     },
  //                                                     layout: 'noBorders'
  //                                                 }
  //                                             ]
  //                                         ]
  //                                     },
  //                                     layout: {
  //                                         hLineWidth: () => 1,
  //                                         vLineWidth: function (i, node) {
  //                                             // Only draw left (0), middle (1), and right (node.table.widths.length)
  //                                             // Skip right side of middle column (i === 2)
  //                                             return (i === 0 || i === 1 || i === node.table.widths.length) ? 1 : 0;
  //                                         },
  //                                         hLineColor: () => '#000000',
  //                                         vLineColor: () => '#000000'
  //                                     },
  //                                     margin: [0, 0, 0, 20]
  //                                 },
  //                                 {
  //                                     table: {
  //                                         widths: ['50%', '50%'],
  //                                         body: [
  //                                             [
  //                                                 { text: 'Bill To', style: 'tableHeader' },
  //                                                 { text: 'Ship To', style: 'tableHeader' }
  //                                             ],
  //                                             [
  //                                                 {
  //                                                     stack: [
  //                                                         data.billingAddress.name,
  //                                                         ` ${data.billingAddress.address} ${data.billingAddress.state} ${data.billingAddress.pincode}`,
  //                                                         data.billingAddress.gstin
  //                                                     ],
  //                                                     margin: [5, 5, 5, 5]
  //                                                 },
  //                                                 {
  //                                                     stack: [
  //                                                         data.shippingAddress.name,
  //                                                         ` ${data.shippingAddress.address} ${data.shippingAddress.state} ${data.shippingAddress.pincode}`,
  //                                                         data.billingAddress.gstin
  //                                                     ],
  //                                                     margin: [5, 5, 5, 5]
  //                                                 }
  //                                             ]
  //                                         ]
  //                                     },
  //                                     layout: {
  //                                         hLineWidth: function () { return 1; },
  //                                         vLineWidth: function () { return 1; },
  //                                         hLineColor: function () { return '#000000'; },
  //                                         vLineColor: function () { return '#000000'; }
  //                                     },
  //                                     margin: [0, 0, 0, 20]
  //                                 },
  //                                 {
  //                                     table: {
  //                                         headerRows: 1,
  //                                         widths: [10, '*', 50, 30, 40, 50, 40, 40, 50],
  //                                         body: [
  //                                             [
  //                                                 { text: '#', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'ITEM', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'HSN/SAC', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'QTY', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'RATE', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'DISCOUNT', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'CGST', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'SGST', style: 'tableHeader', alignment: 'center' },
  //                                                 { text: 'AMOUNT', style: 'tableHeader', alignment: 'center' }
  //                                             ],
  //                                             ...data.items.map((item, index) => {
  //                                                 return [
  //                                                     { text: index + 1, alignment: 'center' },
  //                                                     { text: item.name, alignment: 'left' },
  //                                                     { text: item.hsnOrSac, alignment: 'center' },
  //                                                     { text: item.quantity, alignment: 'center' },
  //                                                     { text: `₹${item.rate}`, alignment: 'center' },
  //                                                     { text: `₹${item.discount}`, alignment: 'center' },
  //                                                     { text: `9% ${item.cgst}`, alignment: 'center' },
  //                                                     { text: `9% ${item.sgst}`, alignment: 'center' },
  //                                                     { text: `${item.total}`, alignment: 'center' }
  //                                                 ]
  //                                             }),

  //                                         ]
  //                                     },
  //                                     layout: {
  //                                         hLineWidth: function () { return 1; },
  //                                         vLineWidth: function () { return 1; },
  //                                         hLineColor: function () { return '#000000'; },
  //                                         vLineColor: function () { return '#000000'; },
  //                                         paddingLeft: function () { return 5; },
  //                                         paddingRight: function () { return 5; },
  //                                         paddingTop: function () { return 2; },
  //                                         paddingBottom: function () { return 2; }
  //                                     },
  //                                     margin: [0, 0, 0, 10]
  //                                 },

  //                                 // NEW layout starts here
  //                                 {
  //                                     stack: [
  //                                         {
  //                                             columns: [
  //                                                 {
  //                                                     width: '60%',
  //                                                     table: {
  //                                                         widths: ['*'],
  //                                                         body: [
  //                                                             [{
  //                                                                 text: [
  //                                                                     { text: 'Total In Words:\n', bold: true, style: 'termConditions' },
  //                                                                     'Five Thousand One Hundred Eighty-One and Six Tenths'], style: ''
  //                                                             }
  //                                                             ],

  //                                                             [{
  //                                                                 text: [
  //                                                                     { text: 'Bank Details:\n', bold: true, style: 'termConditions' },
  //                                                                     'Account No.: 585889855889985\n',
  //                                                                     'IFDC Code: HDFC001\n',
  //                                                                     'Branch Name: New Delhi\n',
  //                                                                 ]
  //                                                             }
  //                                                             ],
  //                                                             //  [{ text: '', margin: [0,10,0,0] }],
  //                                                             [{ text: 'Thank you For the Payment. You Just made our day.', style: 'leftFooter' }],
  //                                                             [{
  //                                                                 text: [
  //                                                                     { text: 'Terms & Conditions:\n', bold: true, style: 'termConditions' },
  //                                                                     'By using our services, you agree to comply with all applicable laws and our policies.'], style: ''
  //                                                             }
  //                                                             ],
  //                                                         ]
  //                                                     },
  //                                                     layout: {
  //                                                         hLineWidth: function () { return 0; },
  //                                                         vLineWidth: function () { return 0; },
  //                                                         hLineColor: function () { return '#000000'; },
  //                                                         paddingTop: function () { return 5; },
  //                                                         paddingBottom: function () { return 5; }
  //                                                     },
  //                                                     margin: [0, 0, 2, 0]
  //                                                 },
  //                                                 {
  //                                                     width: '40%',
  //                                                     table: {
  //                                                         widths: ['*', 'auto'],
  //                                                         body: [
  //                                                             ['Sub Total', `₹${data.totals.subTotal}`],
  //                                                             ['Delivery Charges', '₹0'],
  //                                                             ['Coupon', `₹${data.totals.discount ? data.totals.discount : "0"}`],
  //                                                             ['CGST', `₹${data.totals.totalCgst}`],
  //                                                             ['SGST', `₹${data.totals.totalSgst}`],
  //                                                             ['Total Amount', `₹${data.totals.grandTotal}`],
  //                                                             ['Payment Advance', `₹${data.totals.paymentAdvance}`],
  //                                                             [
  //                                                                 { text: 'Pending Amount', style: 'boldText' },
  //                                                                 { text: `₹${data.totals.pendingAmount}`, style: 'boldText' }
  //                                                             ]
  //                                                         ]
  //                                                     },
  //                                                     layout: {
  //                                                         hLineWidth: function () { return 0; },
  //                                                         vLineWidth: function (i, node) {
  //                                                             return (i === 0) ? 1 : 0; // only the left border
  //                                                         },
  //                                                         vLineColor: function () { return '#000000'; },
  //                                                         paddingTop: function () { return 5; },
  //                                                         paddingBottom: function () { return 5; },
  //                                                     },
  //                                                     margin: [0, 0, 0, 0]

  //                                                 },
  //                                             ],

  //                                             columnGap: 10,
  //                                             margin: [0, 10, 0, 10]
  //                                         },
  //                                     ]
  //                                 },

  //                                 {
  //                                     columns: [
  //                                         {
  //                                             width: '70%',
  //                                             stack: [
  //                                                 {
  //                                                     image: `data:image/png;base64,${data.seller.store_logo}`,
  //                                                     width: 50,
  //                                                     height:50,
  //                                                     margin: [0, 0, 0, 5]
  //                                                 },
  //                                                 { text: 'Thank you for shopping', bold: true, style: { fontSize: 13 }, margin: [5, 0, 0, 0] }
  //                                             ]
  //                                         },
  //                                          {
  //                                             width: '70%',
  //                                             stack: [
  //                                                 {
  //                                                     image: `data:image/png;base64,${data.seller.store_logo}`,
  //                                                     width: 100,
  //                                                     height:50,
  //                                                     margin: [0, 0, 0, 5]
  //                                                 },
  //                                                 { text: 'Store Signature', bold: true, style: { fontSize: 13 }, margin: [5, 0, 0, 0] }
  //                                             ]
  //                                         },

  //                                     ],
  //                                     columnGap: 10,
  //                                     margin: [0, 20, 0, 5]
  //                                 },
  //                                 {
  //                                     text: [
  //                                         'Customers desirous of availing input GST credit are requested to create a Business account and purchase on ',
  //                                         { text: 'LOVOJ', bold: true },
  //                                         ' from Business eligible offers\n',
  //                                         'Please note that the invoice is not a demand for payment'
  //                                     ],
  //                                     alignment: 'center',
  //                                     margin: [0, 10, 0, 0]
  //                                 }

  //                             ],
  //                             margin: [4, 10, 4, 10] // inner padding of the bordered area
  //                         }
  //                     ]
  //                 ]
  //             },
  //             layout: {
  //                 hLineWidth: function () { return 1; },
  //                 vLineWidth: function () { return 1; },
  //                 hLineColor: function () { return '#000000'; },
  //                 vLineColor: function () { return '#000000'; }
  //             }
  //         }
  //     ],
  //     styles: {
  //         header: {
  //             fontSize: 16,
  //             bold: true
  //         },
  //         companyAddress: {
  //             fontSize: 10,
  //             lineHeight: 1.2
  //         },
  //         invoiceTitle: {
  //             fontSize: 16,
  //             bold: true,
  //         },
  //         tableHeader: {
  //             bold: true,
  //             fontSize: 10,
  //             fillColor: '#EEEEEE'
  //         },
  //         leftFooter: {
  //             italic: true,
  //             fontSize: 10,
  //         },
  //         centeredText: {
  //             alignment: 'center'
  //         },
  //         boldText: {
  //             bold: true
  //         },
  //         termConditions: {
  //             fontSize: 12,
  //         },
  //         signature: {
  //             fontSize: 14,
  //         },
  //     },
  //     defaultStyle: {
  //         fontSize: 10,
  //         lineHeight: 1.2
  //     }
  // };

  var dd = {
    content: [
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      // Left: Logo
                      {
                        width: "25%",
                        stack: [
                          {
                            image: `data:image/png;base64,${data.seller.store_logo}`,
                            width: 100,
                            margin: [0, 30, 0, 0],
                          },
                        ],
                      },
                      // Center: Company Name & Address
                      {
                        width: "55%",
                        stack: [
                          {
                            text: `${data?.seller?.name}`,
                            style: "header",
                            alignment: "left",
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: [`${data.companyAddress}`],
                            style: "companyAddress",
                            alignment: "left",
                            margin: [0, 0, 0, 0],
                          },
                        ],
                      },
                      // Right: TAX INVOICE bottom-aligned
                      {
                        width: "20%",
                        stack: [
                          {
                            text: "TAX INVOICE",
                            style: "invoiceTitle",
                            alignment: "right",
                            margin: [0, 85, 0, 0],
                          },
                        ],
                      },
                    ],
                    columnGap: 10,
                    margin: [0, 0, 0, 0],
                  },
                  {
                    table: {
                      widths: ["60%", "1%", "39%"],
                      body: [
                        [
                          // Left column table
                          {
                            table: {
                              widths: ["40%", "60%"],
                              body: [
                                [
                                  "Invoice No.",
                                  `:${data.CustomersSection[0].InvoiceNumber}`,
                                ],
                                ["Invoice Date", `:${data.invoiceDate}`],
                                ["Delivery Date", `:${data.deliveryDate}`],
                                ["Trial Date", `:${data.trialDate}`],
                              ],
                            },
                            layout: {
                              hLineWidth: () => 0,
                              vLineWidth: () => 0,
                            },
                          },
                          // Middle border column (just empty)
                          "",
                          // Right column table
                          {
                            table: {
                              body: [
                                [
                                  {
                                    text: `Order Number      : ${data.order_number}`,
                                    alignment: "left",
                                    margin: [0, 0, 0, 0],
                                  },
                                ],
                                [
                                  {
                                    text: `Place of Supply    :${data.CustomersSection[0].placeOfSupply}`,
                                    alignment: "left",
                                    margin: [0, 0, 0, 0],
                                  },
                                ],
                                [
                                  {
                                    text: "Payment Terms:    : {{}}",
                                    alignment: "left",
                                    margin: [0, 0, 0, 0],
                                  },
                                ],
                                [
                                  {
                                    text: "Eway Bill & Date    : {{}}",
                                    alignment: "left",
                                    margin: [0, 0, 0, 0],
                                  },
                                ],
                              ],
                            },
                            layout: "noBorders",
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: () => 1,
                      vLineWidth: function (i, node) {
                        // Only draw left (0), middle (1), and right (node.table.widths.length)
                        // Skip right side of middle column (i === 2)
                        return i === 0 ||
                          i === 1 ||
                          i === node.table.widths.length
                          ? 1
                          : 0;
                      },
                      hLineColor: () => "#000000",
                      vLineColor: () => "#000000",
                    },
                    margin: [0, 0, 0, 20],
                  },
                  {
                    table: {
                      widths: ["50%", "50%"],
                      body: [
                        [
                          { text: "Bill To", style: "tableHeader" },
                          { text: "Ship To", style: "tableHeader" },
                        ],
                        [
                          {
                            stack: [
                              data.CustomersSection[0]?.BillingAddressName,
                              ` ${data.CustomersSection[0]?.BillingAddress} ${data.CustomersSection[0]?.state} ${data.CustomersSection[0]?.pincode}`,
                              data.CustomersSection[0]?.GstIn,
                            ],
                            margin: [5, 5, 5, 5],
                          },
                          {
                            stack: [
                              data.CustomersSection[0]?.ShippingAddress,
                              // ` ${data.shippingAddress.address} ${data.shippingAddress.state} ${data.shippingAddress.pincode}`,
                              `${data.CustomersSection[0]?.ShippingAddress}`,
                              data.CustomersSection[0]?.GstIn,
                            ],
                            margin: [5, 5, 5, 5],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineWidth: function () {
                        return 1;
                      },
                      vLineWidth: function () {
                        return 1;
                      },
                      hLineColor: function () {
                        return "#000000";
                      },
                      vLineColor: function () {
                        return "#000000";
                      },
                    },
                    margin: [0, 0, 0, 20],
                  },
                  {
                    table: {
                      headerRows: 2,
                      widths: [10, "*", 40, 30, 40, 25, 25, 40, 40, 40, 30],
                      body: [
                        [
                          {
                            text: "#",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                          {
                            text: "ITEM",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                          {
                            text: "HSN/SAC",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                          {
                            text: "QTY",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                          {
                            text: "RATE",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                          {
                            text: "CHARGES",
                            style: "tableHeader",
                            alignment: "center",
                            colSpan: 2,
                          },
                          {}, // making & fabric
                          {
                            text: "EXTRA CHARGES",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                          {
                            text: "GST",
                            style: "tableHeader",
                            alignment: "center",
                            colSpan: 2,
                          },
                          {}, // CGST & SGST
                          {
                            text: "AMT",
                            style: "tableHeader",
                            alignment: "center",
                            rowSpan: 2,
                          },
                        ],
                        [
                          {},
                          {},
                          {},
                          {},
                          {},
                          {
                            text: "Making",
                            style: "tableHeader2",
                            alignment: "center",
                          },
                          {
                            text: "Fabric",
                            style: "tableHeader2",
                            alignment: "center",
                          },
                          {}, // Extra Charges
                          {
                            text: "CGST",
                            style: "tableHeader2",
                            alignment: "center",
                          },
                          {
                            text: "SGST",
                            style: "tableHeader2",
                            alignment: "center",
                          },
                          {}, // Amount
                        ],
                        ...data.ProductSection.map((item, index) => {
                          return [
                            { text: index + 1, alignment: "center" },
                            {
                              text: item.name ? item.name : "-",
                              alignment: "left",
                            },
                            { text: "-", alignment: "center" },
                            { text: item.quantity, alignment: "center" },
                            {
                              text: `₹${
                                item.price_breakup.making_charges +
                                item.price_breakup.fabric_price
                              }`,
                              alignment: "center",
                            },
                            {
                              text: `₹${item.price_breakup.making_charges}`,
                              alignment: "center",
                            },
                            {
                              text: `₹${item.price_breakup.fabric_price}`,
                              alignment: "center",
                            },
                            { text: `₹0`, alignment: "center" },
                            { text: `9% ${item.cgst}`, alignment: "center" },
                            { text: `9% ${item.sgst}`, alignment: "center" },
                            { text: `${item.price}`, alignment: "center" },
                          ];
                        }),
                      ],
                    },
                    layout: {
                      hLineWidth: () => 1,
                      vLineWidth: () => 1,
                      hLineColor: () => "#000000",
                      vLineColor: () => "#000000",
                      paddingLeft: () => 5,
                      paddingRight: () => 5,
                      paddingTop: () => 2,
                      paddingBottom: () => 2,
                    },
                    margin: [0, 0, 0, 10],
                  },

                  // NEW layout starts here
                  {
                    stack: [
                      {
                        columns: [
                          {
                            width: "60%",
                            table: {
                              widths: ["*"],
                              body: [
                                [
                                  {
                                    text: [
                                      {
                                        text: "Total In Words:\n",
                                        bold: true,
                                        style: "termConditions",
                                      },
                                      "Five Thousand One Hundred Eighty-One and Six Tenths",
                                    ],
                                    style: "",
                                  },
                                ],

                                [
                                  {
                                    text: [
                                      {
                                        text: "Bank Details:\n",
                                        bold: true,
                                        style: "termConditions",
                                      },
                                      "Account No.: 585889855889985\n",
                                      "IFDC Code: HDFC001\n",
                                      "Branch Name: New Delhi\n",
                                    ],
                                  },
                                ],
                                //  [{ text: '', margin: [0,10,0,0] }],
                                [
                                  {
                                    text: "Thank you For the Payment. You Just made our day.",
                                    style: "leftFooter",
                                  },
                                ],
                                [
                                  {
                                    text: [
                                      {
                                        text: "Terms & Conditions:\n",
                                        bold: true,
                                        style: "termConditions",
                                      },
                                      "By using our services, you agree to comply with all applicable laws and our policies.",
                                    ],
                                    style: "",
                                  },
                                ],
                              ],
                            },
                            layout: {
                              hLineWidth: function () {
                                return 0;
                              },
                              vLineWidth: function () {
                                return 0;
                              },
                              hLineColor: function () {
                                return "#000000";
                              },
                              paddingTop: function () {
                                return 5;
                              },
                              paddingBottom: function () {
                                return 5;
                              },
                            },
                            margin: [0, 0, 2, 0],
                          },
                          {
                            width: "40%",
                            table: {
                              widths: ["*", "auto"],
                              body: [
                                [
                                  "Sub Total",
                                  `₹${data.CoastSection[0].SubTotal}`,
                                ],
                                ["Delivery Charges", "₹0"],
                                [
                                  "Coupon",
                                  `₹${
                                    data.CoastSection[0].CouponAmount
                                      ? data.CoastSection[0].CouponAmount
                                      : "0"
                                  }`,
                                ],
                                ["CGST", `₹${data.CoastSection[0].Cgst}`],
                                ["SGST", `₹${data.CoastSection[0].Sgst}`],
                                [
                                  "Total Amount",
                                  `₹${data.CoastSection[0].TotalAmount}`,
                                ],
                                [
                                  "Payment Advance",
                                  `₹${data.CoastSection[0].PaymentAdvance}`,
                                ],
                                [
                                  { text: "Pending Amount", style: "boldText" },
                                  {
                                    text: `₹${data.CoastSection[0].PendingAmount}`,
                                    style: "boldText",
                                  },
                                ],
                              ],
                            },
                            layout: {
                              hLineWidth: function () {
                                return 0;
                              },
                              vLineWidth: function (i, node) {
                                return i === 0 ? 1 : 0; // only the left border
                              },
                              vLineColor: function () {
                                return "#000000";
                              },
                              paddingTop: function () {
                                return 5;
                              },
                              paddingBottom: function () {
                                return 5;
                              },
                            },
                            margin: [0, 0, 0, 0],
                          },
                        ],

                        columnGap: 10,
                        margin: [0, 10, 0, 10],
                      },
                    ],
                  },

                  {
                    columns: [
                      {
                        width: "70%",
                        stack: [
                          {
                            image: `data:image/png;base64,${data.seller.store_logo}`,
                            width: 70,
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: "Thank you for shopping",
                            bold: true,
                            style: { fontSize: 13 },
                            margin: [5, 0, 0, 0],
                          },
                        ],
                      },
                      {
                        stack: [
                          {
                            image: `data:image/png;base64,${data.seller.store_logo}`,
                            width: 70,
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: "Signature",
                            bold: true,
                            style: { fontSize: 13 },
                            margin: [5, 0, 0, 0],
                          },
                        ],
                      },
                    ],
                    columnGap: 10,
                    margin: [0, 20, 0, 5],
                  },
                  {
                    text: [
                      "Customers desirous of availing input GST credit are requested to create a Business account and purchase on ",
                      { text: "LOVOJ", bold: true },
                      " from Business eligible offers\n",
                      "Please note that the invoice is not a demand for payment",
                    ],
                    alignment: "center",
                    margin: [0, 10, 0, 0],
                  },
                ],
                margin: [4, 10, 4, 10], // inner padding of the bordered area
              },
            ],
          ],
        },
        layout: {
          hLineWidth: function () {
            return 1;
          },
          vLineWidth: function () {
            return 1;
          },
          hLineColor: function () {
            return "#000000";
          },
          vLineColor: function () {
            return "#000000";
          },
        },
      },
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
      },
      companyAddress: {
        fontSize: 10,
        lineHeight: 1.2,
      },
      invoiceTitle: {
        fontSize: 16,
        bold: true,
      },
      tableHeader2: {
        bold: true,
        fontSize: 7,
        fillColor: "#EEEEEE",
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        fillColor: "#EEEEEE",
      },
      leftFooter: {
        italic: true,
        fontSize: 10,
      },
      centeredText: {
        alignment: "center",
      },
      boldText: {
        bold: true,
      },
      termConditions: {
        fontSize: 12,
      },
      signature: {
        fontSize: 14,
      },
    },
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.2,
    },
  };

  // Create the PDF and write to a file
  const pdfDoc = printer.createPdfKitDocument(dd);
  return pdfDoc;
};
