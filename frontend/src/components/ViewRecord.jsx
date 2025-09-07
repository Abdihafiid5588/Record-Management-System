import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_URL } from '../utils/api'; // adjust path if needed
import logo from '../images/logo.png'; // <-- make sure this exists: src/images/logo.png

const ViewRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image states
  const [imageSrc, setImageSrc] = useState(null); // object URL for <img>
  const [imageLoading, setImageLoading] = useState(false);

  // Auth helpers
  const getAuthToken = () => localStorage.getItem('token');
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper for file base (remove trailing /api if present)
  const baseForFiles = (API_URL || '').replace(/\/api\/?$/, '');

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
        console.log('Fetching record from:', url);

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          const text = await response.text();
          console.error('Failed to fetch record:', response.status, text);
          throw new Error('Failed to fetch record');
        }

        const data = await response.json();
        if (!cancelled) setRecord(data);
      } catch (err) {
        console.error('Error fetching record:', err);
        if (!cancelled) setError('Ku guuldareystay in xogta la soo dejiyo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecord();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fetch protected image as blob and convert to object URL
  useEffect(() => {
    if (!record || !record.photo_url) {
      setImageSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    const fetchImage = async () => {
      setImageLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          handleUnauthorized();
          return;
        }

        const filePath = record.photo_url.startsWith('http')
          ? record.photo_url
          : `${baseForFiles}${record.photo_url.startsWith('/') ? '' : '/'}${record.photo_url}`;

        console.log('Fetching image from:', filePath);

        const res = await fetch(filePath, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          console.error('Image fetch failed:', res.status, text);
          throw new Error(`Image fetch failed with status ${res.status}`);
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setImageSrc(objectUrl);
      } catch (err) {
        console.error('Error fetching protected image:', err);
        if (!cancelled) setImageSrc(null);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.photo_url]);

  // Improved print: open new window, inject styles, wait for images to load, then print.
  const handlePrint = () => {
    const printContent = document.getElementById('printable-record');
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) {
      // popup blocked
      alert('Please allow popups for this site to print.');
      return;
    }

    const css = `
      body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 20px; }
      .print-header { text-align: center; margin-bottom: 10px; }
      .print-header img { height: 110px; display: block; margin: 0 auto 6px; }
      .print-title { font-size: 22px; font-weight: 700; text-transform: uppercase; margin-top: 8px; }
      .print-subtitle { font-size: 18px; font-weight: 700; margin-top: 6px; text-decoration: underline; }
      .print-line { font-weight: 600; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
      table td { border: 1px solid #ccc; padding: 8px; vertical-align: top; }
      .center { text-align: center; }
    `;

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Daabac Xog</title>
          <style>${css}</style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();

    // wait images to load
    const imgs = win.document.images;
    if (imgs.length === 0) {
      win.focus();
      win.print();
      win.close();
      return;
    }

    let loaded = 0;
    for (let i = 0; i < imgs.length; i++) {
      imgs[i].onload = imgs[i].onerror = () => {
        loaded++;
        if (loaded === imgs.length) {
          win.focus();
          win.print();
          win.close();
        }
      };
    }
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
        <button
          onClick={() => navigate('/records-list')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Ku noqo Xogaha
        </button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          Xog lama helin
        </div>
        <button
          onClick={() => navigate('/records-list')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Ku noqo Xogaha
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Faahfaahinta Xogta</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/records-list')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
            >
              Ku noqo Xogaha
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m4 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-6a2 2 0 00-2 2v4a2 2 0 002 2z"></path>
              </svg>
              Daabac
            </button>
          </div>
        </div>

        {/* Printable section */}
        <div id="printable-record" className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
          {/* Header that matches the image */}
          <div className="print-header text-center mb-6">
            <img src={logo} alt="Logo" className="mx-auto h-28 object-contain" />
            <div className="print-title">SOMALI NATIONAL ARMED FORCES</div>
            <div className="print-subtitle">WAAXDA SAHANKA IYO SIRDOONKA CIIDANKA XDS</div>
            <div className="print-line">LAANTA DABAGALKA & HUBINTA GUUD</div>
            <div className="print-line">WARQADA CADEYNTA HUBINTA GUUD EE CIIDANKA DHULKA XDS</div>
          </div>

          

          {/* Profile card */}
          <div className="flex items-center gap-6 mb-8">
            {record.photo_url && (
              <>
                {imageLoading ? (
                  <div className="h-32 w-32 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Record"
                    className="h-32 w-32 object-cover rounded-lg border border-gray-300 shadow"
                    onError={() => setImageSrc(null)}
                  />
                ) : (
                  <div className="h-32 w-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-sm text-gray-500">
                    No image
                  </div>
                )}
              </>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{record.full_name}</h2>
              {record.nickname && (
                <p className="text-gray-600">Nickname: {record.nickname}</p>
              )}
              <p className="text-gray-600">taariikhda lasoo xiray: {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          {/* Info Table */}
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Macluumaadka Shaqsiga</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <tbody>
                <tr><td className="border px-4 py-2 font-medium">Magaca Hooyo</td><td className="border px-4 py-2">{record.mothers_name || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Dhalashada</td><td className="border px-4 py-2">{record.date_of_birth ? new Date(record.date_of_birth).toLocaleDateString() : 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Qabiil</td><td className="border px-4 py-2">{record.tribe || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Telefoonka Waalidka</td><td className="border px-4 py-2">{record.parent_phone || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Telefoonka</td><td className="border px-4 py-2">{record.phone || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Xaaladda Guurka</td><td className="border px-4 py-2">{record.marital_status || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Carruur</td><td className="border px-4 py-2">{record.number_of_children || '0'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Deegaanka</td><td className="border px-4 py-2">{record.residence || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Waxbarasho</td><td className="border px-4 py-2">{record.education_level || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Luuqadaha</td><td className="border px-4 py-2">{record.languages_spoken || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Xirfado</td><td className="border px-4 py-2">{record.technical_skills || 'N/A'}</td></tr>
                {record.additional_details && (
                  <tr><td className="border px-4 py-2 font-medium">Faahfaahin Dheeraad ah</td><td className="border px-4 py-2">{record.additional_details}</td></tr>
                )}
                <tr><td className="border px-4 py-2 font-medium">Baasaaboorka</td><td className="border px-4 py-2">{record.has_passport ? 'Haa' : 'Maya'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Xabsi hore</td><td className="border px-4 py-2">{record.ever_arrested ? 'Haa' : 'Maya'}</td></tr>
                {record.ever_arrested && (
                  <>
                    <tr><td className="border px-4 py-2 font-medium">Goobta horey looka Xiray</td><td className="border px-4 py-2">{record.arrest_location || 'N/A'}</td></tr>
                    <tr><td className="border px-4 py-2 font-medium">Sababta horey looku soo Xiray</td><td className="border px-4 py-2">{record.arrest_reason || 'N/A'}</td></tr>
                    <tr><td className="border px-4 py-2 font-medium">Taariikhda La Xiray</td><td className="border px-4 py-2">{record.arrest_date ? new Date(record.arrest_date).toLocaleDateString() : 'N/A'}</td></tr>
                    <tr><td className="border px-4 py-2 font-medium">Taliyaha/Laanta Xiray</td><td className="border px-4 py-2">{record.arresting_authority || 'N/A'}</td></tr>
                  </>
                )}
                <tr><td className="border px-4 py-2 font-medium">Feel No</td><td className="border px-4 py-2">{record.feel_no || 'N/A'}</td></tr>
                <tr><td className="border px-4 py-2 font-medium">Baare</td><td className="border px-4 py-2">{record.baare || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Signature Section */}
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="flex justify-between items-end">
              <div className="text-center">
                <div className="border-b border-gray-400 w-48 mb-2"></div>
                <p className="text-sm font-medium">Saxiix</p>
                <p className="text-xs text-gray-600">Signature</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Taariikh: {new Date().toLocaleDateString()}</p>
                <p className="text-xs text-gray-600">Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 no-print">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate(`/edit-record/${record.id}`)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded"
            >
              Wax ka beddel
            </button>
            <button
              onClick={() => navigate('/records-list')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded"
            >
              Ku noqo Liiska
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m4 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-6a2 2 0 00-2 2v4a2 2 0 002 2z"></path>
              </svg>
              Daabac
            </button>
          </div>
        </div>
      </div>

      {/* Print styles kept for in-app print fallback */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-record, #printable-record * { visibility: visible; }
          #printable-record { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ViewRecord;
