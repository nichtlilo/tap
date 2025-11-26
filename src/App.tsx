import { useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';

import SignaturePad from './components/SignaturePad';
import './App.css';

type Customer = {
  fullName: string;
  email: string;
  street: string;
  city: string;
  phone: string;
};

type Order = {
  orderNumber: string;
  technician: string;
  technicianTwo: string;
  month: string;
  year: string;
  company: string;
};

type ServiceEntry = {
  id: string;
  date: string;
  description: string;
  hours: string;
  rate: string;
};

const companyOptions = [
  {
    label: 'IT Systemhaus Alsleben GmbH',
    value: 'alsleben',
    address: 'Treskowallee 114, 10319 Berlin',
  },
  {
    label: 'Talk & Phone GmbH',
    value: 'talk-phone',
    address: 'Treskowallee 114, 10319 Berlin',
  },
];

const paymentOptions = ['Barzahlung', 'Kartenzahlung', 'Rechnung'];

const createEmptyService = (): ServiceEntry => ({
  id: crypto.randomUUID(),
  date: '',
  description: '',
  hours: '',
  rate: '',
});

const formatCurrency = (value: number) =>
  value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

function App() {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [customer, setCustomer] = useState<Customer>({
    fullName: '',
    email: '',
    street: '',
    city: '',
    phone: '',
  });
  const [order, setOrder] = useState<Order>({
    orderNumber: '',
    technician: '',
    technicianTwo: '',
    month: '',
    year: new Date().getFullYear().toString(),
    company: '',
  });
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0]);
  const [services, setServices] = useState<ServiceEntry[]>([createEmptyService()]);
  const [showSecondTechnician, setShowSecondTechnician] = useState(false);
  const [companyTouched, setCompanyTouched] = useState(false);
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);

  const totalHours = useMemo(
    () =>
      services.reduce((acc, service) => {
        const hours = parseFloat(service.hours);
        if (Number.isFinite(hours)) {
          return acc + hours;
        }
        return acc;
      }, 0),
    [services],
  );

  const totalAmount = useMemo(
    () =>
      services.reduce((acc, service) => {
        const rate = parseFloat(service.rate);
        if (Number.isFinite(rate)) {
          return acc + rate;
        }
        return acc;
      }, 0),
    [services],
  );

  const companyAddress = useMemo(
    () => companyOptions.find((company) => company.value === order.company)?.address ?? '',
    [order.company],
  );

  const companyLabel = useMemo(
    () => companyOptions.find((company) => company.value === order.company)?.label ?? '',
    [order.company],
  );

  const companyError = companyTouched && !order.company;

  const handleCustomerChange = (field: keyof Customer, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const handleOrderChange = (field: keyof Order, value: string) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (
    id: string,
    field: keyof Omit<ServiceEntry, 'id'>,
    value: string,
  ) => {
    setServices((prev) =>
      prev.map((service) => (service.id === id ? { ...service, [field]: value } : service)),
    );
  };

  const addService = () => {
    setServices((prev) => [...prev, createEmptyService()]);
  };

  const removeService = (id: string) => {
    setServices((prev) => (prev.length === 1 ? prev : prev.filter((service) => service.id !== id)));
  };

  const handleExportPdf = async () => {
    if (!order.company) {
      setCompanyTouched(true);
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 20;
    let cursorY = 25;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('Leistungsnachweis', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 14;

    pdf.setFontSize(11);
    pdf.text('Techniker:', marginX, cursorY);
    const technicianLines = [
      order.technician || '-',
      order.technicianTwo ? `+ ${order.technicianTwo}` : '',
      companyLabel,
      companyAddress,
    ].filter(Boolean);
    pdf.setFont('helvetica', 'normal');
    pdf.text(technicianLines, marginX, cursorY + 6);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Kunde:', pageWidth / 2 + 5, cursorY);
    const customerLines = [
      customer.fullName || '-',
      customer.street || '',
      customer.city || '',
      customer.phone ? `Tel: ${customer.phone}` : '',
      customer.email ? `E-Mail: ${customer.email}` : '',
    ].filter(Boolean);
    pdf.setFont('helvetica', 'normal');
    pdf.text(customerLines, pageWidth / 2 + 5, cursorY + 6);

    const technicianBlockHeight = (technicianLines.length + 1) * 6;
    const customerBlockHeight = (customerLines.length + 1) * 6;
    cursorY += Math.max(technicianBlockHeight, customerBlockHeight) + 4;

    pdf.setFont('helvetica', 'normal');
    const summaryLines = [
      `Auftragsnummer: ${order.orderNumber || '-'}`,
      `Zeitraum: ${order.month || '-'} ${order.year || ''}`.trim(),
      `Zahlungsart: ${paymentMethod}`,
    ];
    summaryLines.forEach((line) => {
      pdf.text(line, marginX, cursorY);
      cursorY += 6;
    });

    cursorY += 6;

    const tableWidth = pageWidth - marginX * 2;
    const dateWidth = 35;
    const hoursWidth = 30;
    const priceWidth = 35;
    const descWidth = tableWidth - dateWidth - hoursWidth - priceWidth;
    const headerHeight = 8;

    pdf.setFillColor(240, 240, 240);
    pdf.rect(marginX, cursorY, tableWidth, headerHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Datum', marginX + 3, cursorY + 6);
    pdf.text('Beschreibung', marginX + dateWidth + 3, cursorY + 6);
    pdf.text('Stunden', marginX + dateWidth + descWidth + 3, cursorY + 6);
    pdf.text('Preis', marginX + dateWidth + descWidth + hoursWidth + 3, cursorY + 6);
    cursorY += headerHeight;
    pdf.setFont('helvetica', 'normal');

    services.forEach((service) => {
      const dateText = service.date || '-';
      const hoursValue = Number.parseFloat(service.hours);
      const hoursText = Number.isFinite(hoursValue) ? hoursValue.toFixed(2) : '-';
      const rateValue = Number.parseFloat(service.rate);
      const rateText = Number.isFinite(rateValue) ? formatCurrency(rateValue) : '-';
      const descLines = pdf.splitTextToSize(service.description || '-', descWidth - 6);
      const rowHeight = Math.max(descLines.length * 6, 8);

      pdf.text(dateText, marginX + 3, cursorY + 5);
      pdf.text(descLines, marginX + dateWidth + 3, cursorY + 5);
      pdf.text(hoursText, marginX + dateWidth + descWidth + 3, cursorY + 5);
      pdf.text(rateText, marginX + dateWidth + descWidth + hoursWidth + 3, cursorY + 5);

      pdf.line(marginX, cursorY + rowHeight, marginX + tableWidth, cursorY + rowHeight);
      cursorY += rowHeight;
    });

    cursorY += 8;
    pdf.text(`Gesamtstunden: ${totalHours.toFixed(2)}`, marginX, cursorY);
    cursorY += 6;
    pdf.text(`Gesamtpreis: ${formatCurrency(totalAmount)}`, marginX, cursorY);

    cursorY += 20;
    const signatureWidth = 60;
    const signatureHeight = 23;

    if (technicianSignature) {
      pdf.addImage(
        technicianSignature,
        'PNG',
        marginX,
        cursorY - signatureHeight,
        signatureWidth,
        signatureHeight,
      );
    }
    if (customerSignature) {
      pdf.addImage(
        customerSignature,
        'PNG',
        pageWidth - marginX - signatureWidth,
        cursorY - signatureHeight,
        signatureWidth,
        signatureHeight,
      );
    }

    pdf.line(marginX, cursorY, marginX + signatureWidth + 20, cursorY);
    pdf.line(pageWidth - marginX - signatureWidth - 20, cursorY, pageWidth - marginX, cursorY);
    pdf.text('Datum, Unterschrift Techniker', marginX, cursorY + 6);
    pdf.text('Datum, Unterschrift Kunde', pageWidth - marginX - signatureWidth - 10, cursorY + 6);

    pdf.save('leistungsnachweis.pdf');
  };

  const handleAddSecondTechnician = () => {
    setShowSecondTechnician(true);
  };

  const handleRemoveSecondTechnician = () => {
    setShowSecondTechnician(false);
    handleOrderChange('technicianTwo', '');
  };

  return (
    <div className="app-shell">
      <div className="sheet" ref={sheetRef}>
        <header className="sheet-header">
          <div>
            <p className="eyebrow">Leistungsnachweis Generator</p>
            <h1>Erstellen Sie professionelle Leistungsnachweise als PDF</h1>
          </div>
        </header>

        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Kundendaten</p>
              <h2>Informationen zum Kunden</h2>
            </div>
          </div>
          <div className="grid two">
            <label className="input-field">
              <span>Vollständiger Name</span>
              <input
                type="text"
                placeholder="z. B. Max Mustermann"
                value={customer.fullName}
                onChange={(event) => handleCustomerChange('fullName', event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>E-Mail-Adresse</span>
              <input
                type="email"
                placeholder="z. B. max@beispiel.de"
                value={customer.email}
                onChange={(event) => handleCustomerChange('email', event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>Straße und Hausnummer</span>
              <input
                type="text"
                placeholder="z. B. Musterstraße 123"
                value={customer.street}
                onChange={(event) => handleCustomerChange('street', event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>PLZ und Ort</span>
              <input
                type="text"
                placeholder="z. B. 10115 Berlin"
                value={customer.city}
                onChange={(event) => handleCustomerChange('city', event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>Telefonnummer</span>
              <input
                type="tel"
                placeholder="z. B. +49 30 12345678"
                value={customer.phone}
                onChange={(event) => handleCustomerChange('phone', event.target.value)}
              />
            </label>
          </div>

          <div className="payment-selector">
            <span>Zahlungsart</span>
            <div className="payment-options">
              {paymentOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === paymentMethod ? 'active' : ''}
                  onClick={() => setPaymentMethod(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Auftragsinformationen</p>
              <h2>Auftragsnummer und Zeitraum</h2>
            </div>
          </div>
          <div className="grid two">
            <label className="input-field">
              <span>Auftragsnummer</span>
              <input
                type="text"
                placeholder="z. B. AUF-2025-001"
                value={order.orderNumber}
                onChange={(event) => handleOrderChange('orderNumber', event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>Name des Technikers</span>
              <input
                type="text"
                placeholder="z. B. Max Müller"
                value={order.technician}
                onChange={(event) => handleOrderChange('technician', event.target.value)}
              />
            </label>
            {showSecondTechnician && (
              <label className="input-field">
                <div className="label-row">
                  <span>Zweiter Techniker</span>
                  <button type="button" className="text-button" onClick={handleRemoveSecondTechnician}>
                    Entfernen
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="z. B. Anna Schulz"
                  value={order.technicianTwo}
                  onChange={(event) => handleOrderChange('technicianTwo', event.target.value)}
                />
              </label>
            )}
            <label className="input-field">
              <span>Monat</span>
              <input
                type="text"
                placeholder="z. B. November"
                value={order.month}
                onChange={(event) => handleOrderChange('month', event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>Jahr</span>
              <input
                type="number"
                placeholder="2025"
                value={order.year}
                onChange={(event) => handleOrderChange('year', event.target.value)}
              />
            </label>
            <label className="input-field full-width required">
              <span>Firma</span>
              <div className="select-field" data-error={companyError}>
                <select
                  value={order.company}
                  onChange={(event) => handleOrderChange('company', event.target.value)}
                  onBlur={() => setCompanyTouched(true)}
                  required
                  aria-required="true"
                  aria-invalid={companyError}
                >
                  <option value="" disabled>
                    Bitte wählen
                  </option>
                  {companyOptions.map((company) => (
                    <option key={company.value} value={company.value}>
                      {company.label}
                    </option>
                  ))}
                </select>
                <p className={`field-helper ${companyError ? 'error' : ''}`}>
                  {order.company ? companyAddress : 'Pflichtfeld – bitte wählen Sie eine Firma'}
                </p>
              </div>
            </label>
          </div>
          {!showSecondTechnician && (
            <button type="button" className="link-button" onClick={handleAddSecondTechnician}>
              + Zweiten Techniker hinzufügen
            </button>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Erbrachte Leistungen</p>
              <h2>Tragen Sie hier die einzelnen Leistungspositionen ein</h2>
            </div>
          </div>

          <div className="service-table">
            <div className="service-head">
              <span>Datum</span>
              <span>Beschreibung der Leistung</span>
              <span>Stunden</span>
              <span>Preis (€)</span>
            </div>

            {services.map((service) => (
              <div className="service-row" key={service.id}>
                <input
                  type="text"
                  placeholder="tt.mm.jjjj"
                  value={service.date}
                  onChange={(event) => handleServiceChange(service.id, 'date', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="z. B. Frontend-Entwicklung, Meeting, etc."
                  value={service.description}
                  onChange={(event) =>
                    handleServiceChange(service.id, 'description', event.target.value)
                  }
                />
                <div className="hours-field">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    min="0"
                    placeholder="0.0"
                    value={service.hours}
                    onChange={(event) =>
                      handleServiceChange(service.id, 'hours', event.target.value)
                    }
                    aria-label="Stunden"
                  />
                </div>
                <div className="price-field">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={service.rate}
                    onChange={(event) => handleServiceChange(service.id, 'rate', event.target.value)}
                    aria-label="Preis in Euro"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Leistung löschen"
                    onClick={() => removeService(service.id)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 3h6l1 2h5v2h-1l-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 7H3V5h5l1-2Zm8 4H7l1 14h8l1-14Zm-5 2v10H9V9h3Zm2 0h3l-1 10h-2V9Zm-5-4-.34 1h4.68L13 5h-4Z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="service-footer">
            <button type="button" className="ghost" onClick={addService}>
              <span aria-hidden="true">＋</span> Weitere Leistung hinzufügen
            </button>
            <div className="totals">
              <div className="total-hours">
                <span>Gesamtstunden:</span>
                <strong>{totalHours.toFixed(2)}</strong>
              </div>
              <div className="total-amount">
                <span>Gesamtpreis:</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="signature-grid">
          <SignaturePad
            label="Unterschrift Techniker"
            helper="Unterschrift des Technikers zur Bestätigung der erbrachten Leistungen"
            onChange={setTechnicianSignature}
          />
          <SignaturePad
            label="Unterschrift Kunde"
            helper="Unterschrift des Kunden zur Bestätigung der erbrachten Leistungen"
            onChange={setCustomerSignature}
          />
        </section>
      </div>

      <div className="floating-bar">
        <button type="button" className="primary" onClick={handleExportPdf}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3c1 0 1.97.39 2.68 1.1L18.9 8.3c.7.7 1.1 1.67 1.1 2.68V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h5Zm0 2H7a1 1 0 0 0-1 1v12c0 .55.45 1 1 1h10a1 1 0 0 0 1-1v-7h-4a2 2 0 0 1-2-2V5Zm2 0v4h4l-4-4ZM9 14v2h6v-2H9Z" />
          </svg>
          Als PDF exportieren
        </button>
      </div>
    </div>
  );
}

export default App;
