import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_URL } from '../utils/api'; // adjust if needed

const ViewRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image states for photo and fingerprint
  const [photoSrc, setPhotoSrc] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [fingerSrc, setFingerSrc] = useState(null);
  const [fingerLoading, setFingerLoading] = useState(false);

  const getAuthToken = () => localStorage.getItem('token');
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Prepare base for files (remove trailing /api if present)
  const baseForFiles = (API_URL || '').replace(/\/api\/?$/, '');

  // Generic fetch for protected file -> object URL
  const fetchProtectedFileToUrl = async (filePathRaw, setLoading, setSrc) => {
    if (!filePathRaw) {
      setSrc(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    let objectUrl = null;
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const filePath = filePathRaw.startsWith('http')
        ? filePathRaw
        : `${baseForFiles}${filePathRaw.startsWith('/') ? '' : '/'}${filePathRaw}`;

      const res = await fetch(filePath, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error('Protected file fetch failed:', res.status, text);
        throw new Error('File fetch failed');
      }

      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setSrc(objectUrl);
    } catch (err) {
      console.error('Error fetching file:', err);
      if (!cancelled) setSrc(null);
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  };

  // Fetch record data
  useEffect(() => {
    let cancelled = false;
    const fetchRecord = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          handleUnauthorized();
          return;
        }
        const url = buildApiUrl(`/api/records/${id}`);
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!response.ok) {
          console.error('Fetch record failed:', response.status, await response.text());
          throw new Error('Failed to fetch record');
        }
        const data = await response.json();
        if (!cancelled) setRecord(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Ku guuldareystay in xogta la soo dejiyo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRecord();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch protected photo when record loads
  useEffect(() => {
    if (!record) return;
    const cleanupPhoto = fetchProtectedFileToUrl(record.photo_url, setPhotoLoading, setPhotoSrc);
    return cleanupPhoto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.photo_url]);

  // Fetch fingerprint image when record loads (supports record.fingerprint_url)
  useEffect(() => {
    if (!record) return;
    const cleanupFinger = fetchProtectedFileToUrl(record.fingerprint_url, setFingerLoading, setFingerSrc);
    return cleanupFinger;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.fingerprint_url]);

  // Print: open a new window with formatted content so original app state stays intact
  const handlePrint = () => {
    const printContent = document.getElementById('printable-record');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
    if (!printWindow) {
      alert('Print window blocked. Please allow popups for this site.');
      return;
    }
    const styles = `
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: "Times New Roman", serif; color: #111; }
        .page { width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; }
        .header { text-align: center; margin-bottom: 6mm; }
        .title { font-size: 18pt; font-weight: 700; }
        .subtitle { font-size: 11pt; color: #444; }
        table { width: 100%; border-collapse: collapse; font-size: 11pt; }
        td, th { padding: 6px 8px; border: 1px solid #999; vertical-align: top; }
        .no-border { border: none; }
        .photo { width: 120px; height: 140px; object-fit: cover; border: 1px solid #666; }
        .fingerprint-box { width: 140px; height: 140px; border: 1px solid #666; display: inline-block; vertical-align: top; text-align:center; padding-top:6px; font-size:10pt; }
        .signature { margin-top: 18mm; display:flex; justify-content: flex-end; flex-direction: column; align-items: flex-end; }
      </style>
    `;
    printWindow.document.write(`<html><head><title>Print Record</title>${styles}</head><body><div class="page">${printContent.innerHTML}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    // allow rendering then call print
    printWindow.print();
    printWindow.close();
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Xogta waa la soo dejinayaa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
        <button onClick={() => navigate('/records-list')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">Ku noqo Xogaha</button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">Xog lama helin</div>
        <button onClick={() => navigate('/records-list')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">Ku noqo Xogaha</button>
      </div>
    );
  }

  // Helper to display yes/no and format date
  const yesNo = (v) => (v ? 'Haa' : 'Maya');
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : 'N/A');

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Faahfaahinta Xogta</h1>
          <div className="flex space-x-3">
            <button onClick={() => navigate('/records-list')} className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded">Ku noqo Xogaha</button>
            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">Daabac</button>
          </div>
        </div>

        {/* Printable area */}
        <div id="printable-record" className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
          {/* Header like doc */}
          <div className="text-center border-b pb-4 mb-4">
            <div className="uppercase text-sm font-semibold">SOMALI NATIONAL ARMED FORCES</div>
            <div className="text-sm">WAAXDA SAHANKA IYO SIRDOONKA CIIDANKA XDS</div>
            <div className="text-sm">LAANTA DABAGALKA & HUBINTA GUUD</div>
            <h2 className="text-lg font-bold mt-2">WARQADA CADEYNTA HUBINTA GUUD EE CIIDANKA DHULKA XDS</h2>
            <div className="text-sm text-gray-600 mt-1">FEYL34 <span className="mx-4">TR :{record.tr_number || '25/08/2025'}</span></div>
            <div className="text-sm text-gray-600 mt-1">La daabacay: {new Date().toLocaleDateString()}</div>
          </div>

          {/* Top row: photo + main fields + fingerprint */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-32">
              {photoLoading ? (
                <div className="h-36 w-32 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
              ) : photoSrc ? (
                <img src={photoSrc} alt="photo" className="photo w-32 h-40 object-cover rounded-sm border" />
              ) : (
                <div className="h-40 w-32 bg-gray-100 rounded-sm border flex items-center justify-center text-sm text-gray-600">Sawir</div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-2xl font-semibold">{record.full_name || record.name || 'Magaca'}</h3>
              {record.nickname && <p className="text-gray-600">Naaneeys: {record.nickname}</p>}
              <div className="mt-2 text-sm text-gray-700">
                <div>MAGACA HOOYADA: <strong>{record.mothers_name || record.mother_name || 'N/A'}</strong></div>
                <div>N/CIIDAN: <strong>{record.service_number || record.ncid || record.n_ciidan || record.id_number || 'N/CIIDAN'}</strong></div>
                <div>DARAJADA: <strong>{record.rank || record.darajada || 'N/A'}</strong></div>
                <div>JAGADA: <strong>{record.position || record.jagada || 'Maya'}</strong></div>
                <div>COLKA: <strong>{record.unit || record.colka || record.unit_text || 'N/A'}</strong></div>
                <div>T/DHALASHADA: <strong>{record.birth_year || record.date_of_birth || '2001'}</strong></div>
                <div>G/DHALASHADA: <strong>{record.birth_place || record.place_of_birth || 'N/A'}</strong></div>
              </div>
            </div>

            <div className="w-36 text-center">
              {/* fingerprint area */}
              <div className="border p-2" style={{ minHeight: 160 }}>
                {fingerLoading ? (
                  <div className="h-36 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                ) : fingerSrc ? (
                  <img src={fingerSrc} alt="fingerprint" className="w-32 h-36 object-contain" />
                ) : (
                  <div className="fingerprint-box w-32 h-36 flex items-center justify-center text-xs text-gray-600">
                    FINGERPRINT<br/>(Sawirka faraha)
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-2">Meesha faraha lagu dhejiyo</div>
            </div>
          </div>

          {/* Large info table resembling the DOCX */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="font-medium">JINSIGA</td><td>{record.gender || 'Lab'}</td></tr>
                <tr><td className="font-medium">DHIIGA</td><td>{record.blood_type || record.dhiig || 'O+'}</td></tr>
                <tr><td className="font-medium">JINSIYADA</td><td>{record.nationality || record.jinsiyaad || 'Somali'}</td></tr>
                <tr><td className="font-medium">QABIILKA</td><td>{record.tribe || record.qabiilka || 'N/A'}</td></tr>
                <tr><td className="font-medium">QOYSKA</td><td>{record.family || record.family_size || 'N/A'}</td></tr>
                <tr><td className="font-medium">TELL</td><td>{record.phone || record.tell || 'N/A'}</td></tr>
                <tr><td className="font-medium">TELL WAALID</td><td>{record.parent_phone || record.tell_parent || 'N/A'}</td></tr>
                <tr><td className="font-medium">EMAIL</td><td>{record.email || 'N/A'}</td></tr>
                <tr><td className="font-medium">SANADKA TABARKA</td><td>{record.training_year || '2022'}</td></tr>
                <tr><td className="font-medium">XIRFADA</td><td>{record.skills || record.xirfada || 'N/A'}</td></tr>
                <tr><td className="font-medium">ACCOUNT NUMBER</td><td>{record.account_number || record.account || 'N/A'}</td></tr>
                <tr><td className="font-medium">XAALADA GUURKA</td><td>{record.marital_status || record.xaalad_guur || 'N/A'}</td></tr>
                <tr><td className="font-medium">TIRADA CARUURTA</td><td>{record.number_of_children || record.children || '0'}</td></tr>

                {/* Recruitment / travel / other fields */}
                <tr><td className="font-medium">XAGEE KU SOO QAADATAY</td><td>{record.recruited_from || 'N/A'}</td></tr>
                <tr><td className="font-medium">DADKA SIDA FIICAN KUU YAQAANA</td><td>{record.known_people || record.contacts || 'N/A'}</td></tr>
                <tr><td className="font-medium">GOOB DEEGAANKAAGA HADA</td><td>{record.residence || 'Deg/ afgooye'}</td></tr>
                <tr><td className="font-medium">HEERKA WAXBARASHADA</td><td>{record.education_level || 'Maya'}</td></tr>
                <tr><td className="font-medium">LUQADAHA AAD TAQAAN</td><td>{record.languages_spoken || 'Somali'}</td></tr>
                <tr><td className="font-medium">GOBOLADA DALKA AAD AADAY</td><td>{record.regions_visited || 'N/A'}</td></tr>
                <tr><td className="font-medium">SAFAR DALKA DIBADIISA MAGASHAY</td><td>{record.foreign_travel || 'N/A'}</td></tr>
                <tr><td className="font-medium">BAASABOOR MALEEDAHAY</td><td>{yesNo(record.has_passport)}</td></tr>
                <tr><td className="font-medium">HORAY URUR DIIMEED MA USOO NOQOTAY</td><td>{yesNo(record.was_in_religious_group)}</td></tr>
                <tr><td className="font-medium">URUR XAGJIR AH MA LASOO SHAQEYSAY</td><td>{yesNo(record.was_in_extremist_group)}</td></tr>
                <tr><td className="font-medium">WALIGAA MALAGU XIRAY?</td><td>{yesNo(record.ever_detained)}</td></tr>

                {/* Free text / additional details */}
                {record.additional_details && (
                  <tr><td className="font-medium">FAAHFAAHIN</td><td>{record.additional_details}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with official note and signature / fingerprint lines */}
          <div className="mt-8 pt-6 border-t text-sm text-gray-700">
            <p className="mb-6">Anigoo ah: <strong>{record.rank_prefix ? `${record.rank_prefix} ${record.service_number}` : record.rank || ''} {record.full_name}</strong> Waxaan Saxiixay Cadeeyntaan, Waxaana Ka Hor Qoray Warqadaan Laanta Dabagalka Iyo Hubinta Guud Ee Waaxda Sahanka & Sirdoonka C.Dhulka XDS.</p>

            <div className="flex justify-between items-end">
              <div style={{ width: '40%' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: 6, textAlign: 'center' }}>SAXIIXA BAARAHA</div>
              </div>

              <div style={{ width: '35%', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', paddingTop: 6 }}>TAARIIKHDA: {formatDate(record.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons (hidden from print) */}
        <div className="mt-6 no-print">
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate(`/edit-record/${record.id}`)} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded">Wax ka beddel</button>
            <button onClick={() => navigate('/records-list')} className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded">Ku noqo Liiska</button>
            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded">Daabac</button>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-record, #printable-record * { visibility: visible; }
          #printable-record { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; box-sizing: border-box; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ViewRecord;
