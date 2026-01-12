
import { Order, PrintTemplate } from '../types';
import { StorageService } from './storageService';

// --- CÁC MẪU IN MẶC ĐỊNH (PHẢI Ở ĐẦU FILE) ---

export const DEFAULT_INVOICE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @media print { @page { size: A4 portrait; margin: 15mm 10mm; } }
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; color: #000; margin: 0; padding: 0; }
        .invoice-container { width: 100%; max-width: 190mm; margin: 0 auto; position: relative; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .company-info { flex: 1; }
        .company-name { font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 0; }
        .meta-info { text-align: right; min-width: 220px; font-size: 11pt; line-height: 1.3; }
        .title { text-align: center; margin: 25px 0; }
        .title h1 { margin: 0; font-size: 22pt; text-transform: uppercase; font-weight: bold; }
        .customer-box { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px 15px; border-radius: 8px; font-size: 12pt; background-color: #fcfcfc; }
        .info-line { display: flex; justify-content: space-between; gap: 20px; }
        .info-line.first { border-bottom: 1px dotted #ccc; padding-bottom: 6px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 8px; }
        th { background: #f2f2f2; text-transform: uppercase; font-size: 10pt; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; }
        .qr-box { border: 1px solid #eee; padding: 5px; border-radius: 5px; text-align: center; }
        .qr-box img { width: 100px; height: 100px; }
        .qr-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; display: block; }
        .totals-table { width: 320px; border: none; }
        .totals-table td { border: none; padding: 4px 0; }
        .grand-total { border-top: 1.5px solid #000 !important; font-weight: bold; font-size: 14pt; padding-top: 10px !important; }
        .footer { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 40px; }
        .signature-space { height: 80px; }
        .legal-note { text-align: center; font-size: 10pt; font-style: italic; color: #555; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <p class="company-name">{{company_name}}</p>
                <p style="margin: 4px 0 0 0; font-size: 11pt;">Địa chỉ: {{company_address}}</p>
                <p style="margin: 2px 0 0 0; font-size: 11pt;">Điện thoại: {{company_phone}} | MST: {{company_tax_code}}</p>
            </div>
            <div class="meta-info">Mẫu số: <b>01GTKT0/001</b><br>Ký hiệu: <b>LG/26P</b><br>Số: <b style="color: #d32f2f; font-size: 14pt;">{{order_code}}</b></div>
        </div>
        <div class="title"><h1>HÓA ĐƠN BÁN HÀNG</h1><i>Ngày {{day}} tháng {{month}} năm {{year}}</i></div>
        <div class="customer-box">
            <div class="info-line first"><span><b>Khách hàng:</b> {{customer_name}}</span><span><b>Điện thoại:</b> {{customer_phone}}</span></div>
            <div class="info-line"><span style="flex: 1;"><b>Địa chỉ:</b> {{customer_address}}</span><span style="min-width: 200px; text-align: right;"><b>Thanh toán:</b> {{payment_method}}</span></div>
        </div>
        <table>
            <thead><tr><th width="5%">STT</th><th>Tên hàng hóa, dịch vụ / Quy cách</th><th width="10%">ĐVT</th><th width="8%">SL</th><th width="18%">Đơn giá</th><th width="20%">Thành tiền</th></tr></thead>
            <tbody>{{items_table}}</tbody>
        </table>
        <div class="totals-area">
            <div class="qr-box qrcode-section"><img src="{{qr_lookup}}" alt="QR Tra cứu"><span class="qr-label">Quét mã tra cứu bảo hành</span></div>
            <table class="totals-table">
                <tr><td>Cộng tiền hàng:</td><td class="text-right">{{subtotal}}</td></tr>
                <tr><td>Tiền chiết khấu:</td><td class="text-right">-{{discount}}</td></tr>
                <tr><td>Thuế suất GTGT:</td><td class="text-right">{{vat}}</td></tr>
                <tr class="grand-total"><td><b>TỔNG CỘNG:</b></td><td class="text-right"><b>{{total_amount}}</b></td></tr>
            </table>
        </div>
        <div style="margin-top: 10px; font-size: 11pt;">Số tiền bằng chữ: <b style="font-style: italic;">{{total_in_words}}</b></div>
        <div class="footer">
            <div><b>NGƯỜI MUA HÀNG</b><br><i>(Ký, ghi rõ họ tên)</i><div class="signature-space"></div></div>
            <div><b>NGƯỜI BÁN HÀNG</b><br><i>(Ký, ghi rõ họ tên, đóng dấu)</i><div class="signature-space"></div><b style="text-transform: uppercase;">{{staff_name}}</b></div>
        </div>
        <div class="legal-note">Hệ thống quản lý bán hàng chuẩn 2026. Hóa đơn này có giá trị tra cứu bảo hành chính hãng.</div>
    </div>
</body>
</html>
`;

export const DEFAULT_IMPORT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @media print { @page { size: A4 portrait; margin: 15mm; } }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #000; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .title { text-align: center; margin: 20px 0; }
        .title h1 { text-transform: uppercase; margin: 0; font-size: 20pt; font-weight: bold; }
        .doc-meta { text-align: right; font-size: 10pt; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { background: #eee; font-size: 9pt; text-transform: uppercase; font-weight: bold; }
        .footer-sig { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; text-align: center; margin-top: 50px; font-weight: bold; font-size: 11pt; }
        .sig-box { height: 80px; }
    </style>
</head>
<body>
    <div class="header">
        <div><b>Đơn vị: {{company_name}}</b><br>Địa chỉ: {{company_address}}</div>
        <div class="doc-meta"><b>Mẫu số 01-VT</b><br>(Ban hành theo Thông tư 200/2014/TT-BTC)<br>Số phiếu: <b>{{pn_id}}</b></div>
    </div>
    <div class="title"><h1>PHIẾU NHẬP KHO</h1><i>Ngày {{day}} tháng {{month}} năm {{year}}</i></div>
    <div style="margin-bottom: 10px;">- Họ và tên người giao hàng: <b style="text-transform: uppercase;">{{receiver}}</b><br>- Theo chứng từ số: <b>{{ref_info}}</b> của: <b style="text-transform: uppercase;">{{supplier_name}}</b><br>- Nhập tại kho: <b>{{warehouse}}</b></div>
    <table>
        <thead><tr><th width="30">STT</th><th>Tên, nhãn hiệu, quy cách vật tư, sản phẩm</th><th width="60">ĐVT</th><th width="50">SL</th><th width="100">Đơn giá</th><th width="120">Thành tiền</th></tr></thead>
        <tbody>{{items_table}}</tbody>
    </table>
    <div style="text-align: right; font-weight: bold; font-size: 13pt;">Tổng cộng tiền nhập: {{total_amount}}</div>
    <div style="font-style: italic; margin-top: 5px;">Số tiền viết bằng chữ: {{total_in_words}}</div>
    <div class="footer-sig"><div>Người lập biểu<div class="sig-box"></div></div><div>Người giao hàng<div class="sig-box"></div></div><div>Thủ kho<div class="sig-box"></div></div><div>Kế toán trưởng<div class="sig-box"></div></div></div>
</body>
</html>
`;

export const DEFAULT_EXPORT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @media print { @page { size: A4 portrait; margin: 15mm; } }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #000; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .title { text-align: center; margin: 20px 0; }
        .title h1 { text-transform: uppercase; margin: 0; font-size: 20pt; font-weight: bold; }
        .doc-meta { text-align: right; font-size: 10pt; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { background: #eee; font-size: 9pt; text-transform: uppercase; font-weight: bold; }
        .footer-sig { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; text-align: center; margin-top: 50px; font-weight: bold; font-size: 11pt; }
        .sig-box { height: 80px; }
    </style>
</head>
<body>
    <div class="header">
        <div><b>Đơn vị: {{company_name}}</b><br>Địa chỉ: {{company_address}}</div>
        <div class="doc-meta"><b>Mẫu số 02-VT</b><br>(Ban hành theo Thông tư 200/2014/TT-BTC)<br>Số phiếu: <b>{{px_id}}</b></div>
    </div>
    <div class="title"><h1>PHIẾU XUẤT KHO</h1><i>Ngày {{day}} tháng {{month}} năm {{year}}</i></div>
    <div style="margin-bottom: 10px;">- Họ và tên người nhận hàng: <b style="text-transform: uppercase;">{{receiver}}</b><br>- Lý do xuất kho: <b>{{reason}}</b><br>- Xuất tại kho: <b>{{warehouse}}</b></div>
    <table>
        <thead><tr><th width="30">STT</th><th>Tên, nhãn hiệu, quy cách vật tư, sản phẩm</th><th width="60">ĐVT</th><th width="50">SL</th><th width="100">Đơn giá</th><th width="120">Thành tiền</th></tr></thead>
        <tbody>{{items_table}}</tbody>
    </table>
    <div style="text-align: right; font-weight: bold; font-size: 13pt;">Tổng cộng tiền xuất: {{total_amount}}</div>
    <div style="font-style: italic; margin-top: 5px;">Số tiền viết bằng chữ: {{total_in_words}}</div>
    <div class="footer-sig"><div>Người lập biểu<div class="sig-box"></div></div><div>Người nhận hàng<div class="sig-box"></div></div><div>Thủ kho<div class="sig-box"></div></div><div>Kế toán trưởng<div class="sig-box"></div></div></div>
</body>
</html>
`;

export const DEFAULT_NXT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @media print { @page { size: A4 landscape; margin: 10mm; } }
        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; }
        .title { text-align: center; margin: 20px 0; }
        .title h1 { text-transform: uppercase; margin: 0; font-size: 18pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 5px; }
        th { background: #f2f2f2; font-size: 9pt; text-transform: uppercase; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer-sig { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; text-align: center; margin-top: 35px; font-weight: bold; }
    </style>
</head>
<body>
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <div>
            <b style="font-size: 12pt; text-transform: uppercase;">{{company_name}}</b><br>
            <span style="font-size: 10pt;">Địa chỉ: {{company_address}}</span>
        </div>
        <div style="text-align:right">
            <b>Mẫu số S12-DN</b><br>
            <small>(Thông tư 200/2014/TT-BTC)</small>
        </div>
    </div>
    <div class="title"><h1>BÁO CÁO NHẬP - XUẤT - TỒN KHO</h1><i>Kỳ báo cáo: Tháng {{month}} năm {{year}}</i></div>
    <table>
        <thead>
            <tr><th rowspan="2" width="30">STT</th><th rowspan="2">Tên hàng hóa, vật tư</th><th rowspan="2" width="50">ĐVT</th><th colspan="2">Đầu kỳ</th><th colspan="2">Nhập trong kỳ</th><th colspan="2">Xuất trong kỳ</th><th colspan="2">Cuối kỳ</th></tr>
            <tr><th width="40">SL</th><th width="90">Giá trị</th><th width="40">SL</th><th width="90">Giá trị</th><th width="40">SL</th><th width="90">Giá trị</th><th width="40">SL</th><th width="90">Giá trị</th></tr>
        </thead>
        <tbody>{{items_table}}</tbody>
        <tr style="font-weight: bold; background: #fafafa;">
            <td colspan="3" class="text-center">TỔNG CỘNG</td>
            <td class="text-center">{{total_opening_qty}}</td><td class="text-right">{{total_opening_val}}</td>
            <td class="text-center">{{total_imp_qty}}</td><td class="text-right">{{total_imp_val}}</td>
            <td class="text-center">{{total_exp_qty}}</td><td class="text-right">{{total_exp_val}}</td>
            <td class="text-center">{{total_closing_qty}}</td><td class="text-right">{{total_closing_val}}</td>
        </tr>
    </table>
    <div class="footer-sig"><div>Người lập biểu</div><div>Thủ kho</div><div>Kế toán trưởng</div><div>Giám đốc / Chủ hộ</div></div>
</body>
</html>
`;

// --- CÁC HÀM XỬ LÝ (LOGIC) ---

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const toDate = (ts: any): Date => {
  if (!ts) return new Date();
  if (typeof ts === 'number') return new Date(ts);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};

const moneyToWords = (total: number): string => {
  if (total === 0) return "Không đồng";
  const units = ["", "ngàn", "triệu", "tỷ", "ngàn tỷ", "triệu tỷ"];
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const readThreeDigits = (n: number, showZero: boolean): string => {
    let res = "";
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    if (hundred > 0 || showZero) res += digits[hundred] + " trăm ";
    if (ten > 1) res += digits[ten] + " mươi ";
    else if (ten === 1) res += "mười ";
    else if (showZero && unit > 0) res += "lẻ ";
    if (ten > 0 && unit === 1) res += "mốt";
    else if (ten > 0 && unit === 5) res += "lăm";
    else if (unit > 0) res += digits[unit];
    return res;
  };
  let res = "";
  let i = 0;
  let remaining = Math.round(Math.abs(total));
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) res = readThreeDigits(chunk, i > 0 || remaining > 1000) + " " + units[i] + " " + res;
    remaining = Math.floor(remaining / 1000);
    i++;
  }
  res = res.trim();
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng chẵn./.";
};

export const renderTemplate = (templateHtml: string, data: Record<string, any>) => {
  let rendered = templateHtml;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key]);
  });
  return rendered;
};

const getQrUrl = (text: string) => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;

export const getMockData = (type: string) => {
  const now = new Date();
  const common = {
    day: now.getDate().toString().padStart(2, '0'),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    year: now.getFullYear(),
    date: now.toLocaleDateString('vi-VN'),
    company_name: 'LGC SHOP - SMART RETAIL 2026',
    company_address: '71 Tân Hội, Đức Trọng, Lâm Đồng',
    company_phone: '0792 630 630',
    company_tax_code: '5801456xxx',
    company_website: 'www.lgcshop.vn',
    qr_lookup: getQrUrl('https://lgcshop.vn/lookup/HD-SAMPLE')
  };

  switch (type) {
    case 'invoice':
      return {
        ...common,
        order_code: 'HD26-00000001',
        customer_name: 'NGUYỄN VĂN KHÁCH MẪU',
        customer_phone: '0901 234 567',
        customer_address: '123 Đường ABC, Phường 4, Quận 5, TP.HCM',
        payment_method: 'Chuyển khoản',
        items_table: `<tr><td style="text-align:center">1</td><td><b>iPhone 15 Pro Max 256GB Titanium</b><br><small style="color:#666; font-size: 10pt;">S/N: IMEI-999222333 | Bảo hành: 12 tháng</small></td><td style="text-align:center">Cái</td><td style="text-align:center">1</td><td style="text-align:right">32.000.000</td><td style="text-align:right">32.000.000</td></tr>`,
        subtotal: '32.000.000 ₫', vat: '3.200.000 ₫', discount: '1.000.000 ₫', total_amount: '34.200.000 ₫', total_in_words: 'Ba mươi bốn triệu hai trăm ngàn đồng chẵn./.', staff_name: 'Lê Văn Admin'
      };
    case 'import':
      return {
        ...common,
        pn_id: 'PN26-00001', supplier_name: 'CÔNG TY TNHH LINH KIỆN CÔNG NGHỆ', supplier_address: 'KCN Tân Bình, Quận Tân Bình, TP.HCM', supplier_phone: '028 3811 1234', warehouse: 'Kho tổng LGC Shop', receiver: 'TRẦN VĂN THỦ KHO', reason: 'Nhập hàng linh kiện tháng 01/2026', ref_info: 'Số 998877 ngày 15/01/2026',
        items_table: `<tr><td style="text-align:center">1</td><td><b>Mainboard ASUS ROG Strix Z790-E</b></td><td style="text-align:center">Cái</td><td style="text-align:center">10</td><td style="text-align:right">8.500.000</td><td style="text-align:right">85.000.000</td></tr>`,
        total_amount: '85.000.000 ₫', total_in_words: 'Tám mươi lăm triệu đồng chẵn./.'
      };
    case 'export':
      return {
        ...common,
        px_id: 'PX26-00001', receiver: 'NGUYỄN VĂN NHẬN', reason: 'Xuất linh kiện lắp ráp đơn hàng #2026-01', warehouse: 'Kho tổng',
        items_table: `<tr><td style="text-align:center">1</td><td>Chuột Logitech G Pro X Superlight</td><td style="text-align:center">Cái</td><td style="text-align:center">1</td><td style="text-align:right">2.500.000</td><td style="text-align:right">2.500.000</td></tr>`,
        total_amount: '2.500.000 ₫', total_in_words: 'Hai triệu năm trăm ngàn đồng chẵn./.'
      };
    case 'report':
      return {
        ...common,
        items_table: `<tr><td style="text-align:center">1</td><td style="font-weight:bold">Sản phẩm mẫu 2026</td><td style="text-align:center">Cái</td><td style="text-align:center">100</td><td style="text-align:right">1.000.000</td><td style="text-align:center">10</td><td style="text-align:right">10.000.000</td><td style="text-align:center">5</td><td style="text-align:right">5.000.000</td><td style="text-align:center">105</td><td style="text-align:right">105.000.000</td></tr>`,
        total_opening_qty: '100', total_opening_val: '100.000.000 ₫', total_imp_qty: '10', total_imp_val: '10.000.000 ₫', total_exp_qty: '5', total_exp_val: '5.000.000 ₫', total_closing_qty: '105', total_closing_val: '105.000.000 ₫'
      };
    default:
      return common;
  }
};

const getCompanyData = async () => {
    const settings = await StorageService.getSettings();
    const info = settings.companyInfo || { name: 'LGC SHOP', address: '', phone: '', taxCode: '', website: '' };
    return {
        company_name: info.name || 'LGC SHOP',
        company_address: info.address || 'Chưa cập nhật địa chỉ',
        company_phone: info.phone || 'Chưa cập nhật SĐT',
        company_tax_code: info.taxCode || 'Chưa cập nhật MST',
        company_website: info.website || 'lgcshop.vn'
    };
};

export const printPreview = async (type: string, contentOverride?: string) => {
    const win = window.open('', '_blank', 'width=1000,height=900');
    if (!win) return alert("Vui lòng cho phép trình duyệt mở Pop-up để xem trước mẫu in.");
    win.document.write("<html><body><p style='font-family: sans-serif; text-align: center; margin-top: 50px;'>Đang khởi tạo dữ liệu xem trước...</p></body></html>");
    try {
        const mockData = getMockData(type);
        let templateHtml = contentOverride;
        if (!templateHtml) {
            const template = await StorageService.getTemplateByType(type);
            if (template) templateHtml = template.content;
            else {
                if (type === 'invoice') templateHtml = DEFAULT_INVOICE_TEMPLATE;
                else if (type === 'import') templateHtml = DEFAULT_IMPORT_TEMPLATE;
                else if (type === 'export') templateHtml = DEFAULT_EXPORT_TEMPLATE;
                else if (type === 'report') templateHtml = DEFAULT_NXT_TEMPLATE;
            }
        }
        const html = renderTemplate(templateHtml || '', mockData);
        win.document.open();
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.focus(); }, 1000);
    } catch (err) {
        win.document.body.innerHTML = `<p style="color: red;">Lỗi khởi tạo mẫu in: ${err}</p>`;
    }
};

export const printInvoice = async (order: Order) => {
  const win = window.open('', '_blank', 'width=900,height=900');
  if (!win) return alert("Vui lòng cho phép trình duyệt mở Pop-up.");
  const settings = await StorageService.getSettings();
  const template = await StorageService.getTemplateByType('invoice');
  const templateHtml = template?.content || DEFAULT_INVOICE_TEMPLATE;
  const companyData = await getCompanyData();
  let finalCustomerAddress = order.customerAddress || '';
  if (!finalCustomerAddress && order.customerId) {
    try {
        const customers = await StorageService.getCustomers();
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) finalCustomerAddress = customer.address || '';
    } catch (e) {}
  }
  const options = settings.invoiceOptions || { showCompanyInfo: true, showCustomerInfo: true, showQRCode: true, showSignatures: true, showStaffName: true };
  
  const itemsTable = order.items.map((item, idx) => {
    const isLoyaltyGift = item.isGift;
    const isPromotionalGift = item.appliedPrice === 0 && !item.isGift;
    const isAnyGift = isLoyaltyGift || isPromotionalGift;
    
    const unitPrice = isAnyGift ? 0 : (item.appliedPrice ?? item.price);
    const lineTotal = unitPrice * item.quantity;
    
    let giftLabel = '';
    if (isLoyaltyGift) {
        // Nhãn Quà Tri Ân (Tím) cho khách đổi điểm
        giftLabel = ' <span style="color:#7c3aed; font-size: 10pt; font-weight: 900; font-family: sans-serif;">(QUÀ TRI ÂN)</span>';
    } else if (isPromotionalGift) {
        // Nhãn Quà Tặng (Xanh lục) cho quà tặng khuyến mãi
        giftLabel = ' <span style="color:#059669; font-size: 10pt; font-weight: 900; font-family: sans-serif;">(QUÀ TẶNG)</span>';
    }

    const showWarrantyOnInvoice = !isAnyGift && item.warrantyPeriod && item.warrantyPeriod > 0;
    const warrantyStr = showWarrantyOnInvoice ? ` | Bảo hành: ${item.warrantyPeriod} tháng` : '';
    const serialStr = (!isAnyGift && item.serials && item.serials.length > 0) ? `S/N: ${item.serials.join(', ')}` : '';
    
    return `<tr>
      <td class="text-center">${idx + 1}</td>
      <td>
        <div style="font-weight: bold;">
          ${item.name}
          ${giftLabel}
        </div>
        <div style="color:#666; font-size: 10pt; margin-top: 2px;">
          ${serialStr ? `<span>${serialStr}</span>` : ''}
          ${warrantyStr ? `<span style="font-style: italic;">${(serialStr ? ' | ' : '') + warrantyStr}</span>` : ''}
        </div>
      </td>
      <td class="text-center">${item.unit || 'Cái'}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${isAnyGift ? '0' : formatVND(unitPrice).replace('₫', '').trim()}</td>
      <td class="text-right">${isAnyGift ? '0' : formatVND(lineTotal).replace('₫', '').trim()}</td>
    </tr>`;
  }).join('');
  
  const dateObj = toDate(order.createdAt);
  const lookupLink = companyData.company_website ? `${companyData.company_website}/lookup/${order.code}` : `lgc-retail-service.web.app/order/${order.code}`;
  const data = { ...companyData, order_code: order.code, customer_name: (order.customerName || 'KHÁCH LẺ').toUpperCase(), customer_phone: order.customerPhone, customer_address: finalCustomerAddress || 'N/A', payment_method: order.paymentMethod === 'cash' ? 'Tiền mặt' : (order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thẻ'), date: dateObj.toLocaleDateString('vi-VN'), day: dateObj.getDate().toString().padStart(2, '0'), month: (dateObj.getMonth() + 1).toString().padStart(2, '0'), year: dateObj.getFullYear(), items_table: itemsTable, subtotal: formatVND(order.subtotal), discount: formatVND(order.discountAmount), vat: formatVND(order.vatTotal), total_amount: formatVND(order.total), total_in_words: moneyToWords(order.total), staff_name: order.staffName, qr_lookup: getQrUrl(lookupLink) };
  let html = renderTemplate(templateHtml, data);
  const displayStyle = `<style>${!options.showCompanyInfo ? '.header .company-info { visibility: hidden; }' : ''}${!options.showCustomerInfo ? '.customer-box { display: none !important; }' : ''}${!options.showQRCode ? '.qrcode-section { display: none !important; }' : ''}${!options.showSignatures ? '.footer { display: none !important; }' : ''}</style>`;
  html = html.replace('</head>', `${displayStyle}</head>`);
  win.document.open(); win.document.write(html); win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

export const printExportReceipt = async (data: any) => {
  const win = window.open('', '_blank', 'width=900,height=900');
  if (!win) return alert("Vui lòng cho phép trình duyệt mở Pop-up.");
  const template = await StorageService.getTemplateByType('export');
  const templateHtml = template?.content || DEFAULT_EXPORT_TEMPLATE;
  const companyData = await getCompanyData();
  const itemsTable = data.items.map((item: any, idx: number) => `<tr><td style="text-align:center">${idx + 1}</td><td><b>${item.name}</b>${item.serials?.length ? `<br><small style="font-size: 9pt;">S/N: ${item.serials.join(', ')}</small>` : ''}</td><td style="text-align:center">${item.unit || 'Cái'}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatVND(item.price).replace('₫', '').trim()}</td><td style="text-align:right">${formatVND(item.total).replace('₫', '').trim()}</td></tr>`).join('');
  const dateObj = toDate(data.timestamp);
  
  const isFromOrder = data.id.startsWith('HD');
  const finalReason = isFromOrder ? `Bán hàng đơn ${data.id}` : (data.reason || 'Xuất bán hàng hóa');
  
  // LOGIC ĐỒNG BỘ TÊN NGƯỜI NHẬN:
  // Nếu là đơn hàng (HD), ưu tiên lấy trường receiver. Nếu receiver trống, lấy supplier_name (lưu tên khách tại POS).
  // Nếu tất cả đều trống mới ghi KHÁCH LẺ.
  let receiverRaw = data.receiver;
  if (!receiverRaw || receiverRaw === 'N/A') {
      receiverRaw = isFromOrder ? (data.supplier_name || 'KHÁCH LẺ') : 'NGƯỜI NHẬN HÀNG';
  }
  const finalReceiverName = receiverRaw.toUpperCase();

  const html = renderTemplate(templateHtml, { 
    ...companyData, 
    px_id: data.id, 
    receiver: finalReceiverName, 
    reason: finalReason, 
    warehouse: data.warehouse || 'Kho tổng LGC', 
    date: dateObj.toLocaleDateString('vi-VN'), 
    day: dateObj.getDate().toString().padStart(2, '0'), 
    month: (dateObj.getMonth() + 1).toString().padStart(2, '0'), 
    year: dateObj.getFullYear(), 
    items_table: itemsTable, 
    total_amount: formatVND(data.total), 
    total_in_words: moneyToWords(data.total) 
  });
  win.document.open(); win.document.write(html); win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

export const printImportReceipt = async (data: any) => {
  const win = window.open('', '_blank', 'width=900,height=900');
  if (!win) return alert("Vui lòng cho phép trình duyệt mở Pop-up.");
  const template = await StorageService.getTemplateByType('import');
  
  const templateHtml = template?.content || DEFAULT_IMPORT_TEMPLATE;
  const companyData = await getCompanyData();
  const itemsTable = data.items.map((item: any, idx: number) => `<tr><td style="text-align:center">${idx + 1}</td><td><b>${item.name}</b></td><td style="text-align:center">${item.unit || 'Cái'}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatVND(item.price).replace('₫', '').trim()}</td><td style="text-align:right">${formatVND(item.total).replace('₫', '').trim()}</td></tr>`).join('');
  
  let refInfo = ".................... ngày ..... tháng ..... năm 20...";
  const refNum = data.refDocNumber || data.referenceId;
  const refDate = data.refDocDate;

  if (refNum) {
      if (refDate) {
          const d = new Date(refDate);
          refInfo = `${refNum} ngày ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      } else {
          refInfo = `${refNum} ngày ..... tháng ..... năm 20...`;
      }
  }

  const dateObj = toDate(data.timestamp);
  
  // Chuẩn hóa tên VIẾT HOA cho Nhà cung cấp và Người giao hàng
  const supplierNameRaw = data.supplier_name || 'NCC VÃNG LAI';
  const finalSupplierName = supplierNameRaw.toUpperCase();
  
  const receiverRaw = data.receiver || 'THỦ KHO';
  const finalReceiverName = receiverRaw.toUpperCase();

  const html = renderTemplate(templateHtml, { 
    ...companyData, 
    pn_id: data.id, 
    date: dateObj.toLocaleDateString('vi-VN'), 
    day: dateObj.getDate().toString().padStart(2, '0'), 
    month: (dateObj.getMonth() + 1).toString().padStart(2, '0'), 
    year: dateObj.getFullYear(), 
    supplier_name: finalSupplierName, 
    warehouse: data.warehouse || 'Kho tổng LGC', 
    receiver: finalReceiverName, 
    reason: data.reason || (data.id.startsWith('RET-HD') ? 'Nhập trả từ đơn bán hàng' : 'Nhập mua hàng hóa'), 
    ref_info: refInfo, 
    items_table: itemsTable, 
    total_amount: formatVND(data.total), 
    total_in_words: moneyToWords(data.total) 
  });
  win.document.open(); win.document.write(html); win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 800);
};

export const printNXTReport = async (data: { month: number, year: number, items: any[] }) => {
    const win = window.open('', '_blank', 'width=1100,height=900');
    if (!win) return alert("Vui lòng cho phép trình duyệt mở Pop-up.");
    const template = await StorageService.getTemplateByType('report');
    const templateHtml = template?.content || DEFAULT_NXT_TEMPLATE;
    const companyData = await getCompanyData();
    let totalOpeningQty = 0, totalOpeningVal = 0, totalImpQty = 0, totalImpVal = 0, totalExpQty = 0, totalExpVal = 0, totalClosingQty = 0, totalClosingVal = 0;
    const itemsTable = data.items.map((p, idx) => {
        const oV = p.opening * p.costPrice; const iV = p.imp * p.costPrice; const eV = p.exp * p.costPrice; const cV = (p.opening + p.imp - p.exp) * p.costPrice;
        totalOpeningQty += p.opening; totalOpeningVal += oV; totalImpQty += p.imp; totalImpVal += iV; totalExpQty += p.exp; totalExpVal += eV; totalClosingQty += (p.opening + p.imp - p.exp); totalClosingVal += cV;
        return `<tr><td class="text-center">${idx + 1}</td><td class="font-bold">${p.name}</td><td class="text-center">${p.unit}</td><td class="text-center">${p.opening}</td><td class="text-right">${formatVND(oV).replace('₫', '').trim()}</td><td class="text-center">${p.imp}</td><td class="text-right">${formatVND(iV).replace('₫', '').trim()}</td><td class="text-center">${p.exp}</td><td class="text-right">${formatVND(eV).replace('₫', '').trim()}</td><td class="text-center">${p.opening + p.imp - p.exp}</td><td class="text-right">${formatVND(cV).replace('₫', '').trim()}</td></tr>`;
    }).join('');
    const html = renderTemplate(templateHtml, { ...companyData, month: data.month.toString().padStart(2, '0'), year: data.year, items_table: itemsTable, total_opening_qty: totalOpeningQty, total_opening_val: formatVND(totalOpeningVal), total_imp_qty: totalImpQty, total_imp_val: formatVND(totalImpVal), total_exp_qty: totalExpQty, total_exp_val: formatVND(totalExpVal), total_closing_qty: totalClosingQty, total_closing_val: formatVND(totalClosingVal) });
    win.document.open(); win.document.write(html); win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 800);
};
