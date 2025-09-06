import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_URL } from '../utils/api';
import logo from '../images/logo.png';

const ViewRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image states
  const [imageSrc, setImageSrc] = useState(null); // profile image
  const [fingerprintSrc, setFingerprintSrc] = useState(null); // fingerprint image
  const [imageLoading, setImageLoading] = useState(false);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);

  // Auth helpers
  const getAuthToken = () => localStorage.getItem('token');
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper for file base
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

  // Fetch protected profile image
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

        console.log('Fetching profile image from:', filePath);

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
  }, [record?.photo_url, baseForFiles]);

  // Fetch protected fingerprint image
  useEffect(() => {
    if (!record || !record.fingerprint_url) {
      setFingerprintSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    const fetchFingerprint = async () => {
      setFingerprintLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          handleUnauthorized();
          return;
        }

        const filePath = record.fingerprint_url.startsWith('http')
          ? record.fingerprint_url
          : `${baseForFiles}${record.fingerprint_url.startsWith('/') ? '' : '/'}${record.fingerprint_url}`;

        console.log('Fetching fingerprint image from:', filePath);

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
          console.error('Fingerprint fetch failed:', res.status, text);
          throw new Error(`Fingerprint fetch failed with status ${res.status}`);
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setFingerprintSrc(objectUrl);
      } catch (err) {
        console.error('Error fetching protected fingerprint:', err);
        if (!cancelled) setFingerprintSrc(null);
      } finally {
        if (!cancelled) setFingerprintLoading(false);
      }
    };

    fetchFingerprint();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [record?.fingerprint_url, baseForFiles]);

  // Print function with updated header and layout
  const handlePrint = () => {
    const printContent = document.getElementById('printable-record');
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) {
      alert('Please allow popups for this site to print.');
      return;
    }

    // Clone the content to preserve structure
    const clonedContent = printContent.cloneNode(true);
    
    // Handle logo image
    const logoImgs = clonedContent.querySelectorAll('.logo-img');
    if (logoImgs.length > 0) {
      fetch(logo)
        .then(response => response.blob())
        .then(blob => {
          const logoUrl = URL.createObjectURL(blob);
          logoImgs.forEach(img => {
            img.src = logoUrl;
          });
        })
        .catch(err => console.error('Failed to convert logo:', err));
    }

    // Handle record image
    const recordImg = clonedContent.querySelector('.record-image');
    if (recordImg && imageSrc) {
      recordImg.src = imageSrc;
    }

    // Handle fingerprint image
    const fingerprintImg = clonedContent.querySelector('.fingerprint-image');
    if (fingerprintImg && fingerprintSrc) {
      fingerprintImg.src = fingerprintSrc;
    }

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const css = `
      body { 
        font-family: Arial, Helvetica, sans-serif; 
        color: #111; 
        margin: 0; 
        padding: 20px;
        line-height: 1.4;
        font-size: 12px;
      }
      .document-header {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .document-header td {
        padding: 5px;
        text-align: center;
        vertical-align: middle;
        border: 1px solid #000;
      }
      .logo-img {
        height: 40px;
        width: auto;
      }
      .header-title {
        font-weight: bold;
        font-size: 16px;
        text-align: center;
        margin: 10px 0;
      }
      .header-subtitle {
        font-weight: bold;
        font-size: 14px;
        text-align: center;
        text-decoration: underline;
        margin: 5px 0;
      }
      .header-line {
        font-weight: bold;
        text-align: center;
        margin: 3px 0;
      }
      .document-info {
        text-align: right;
        margin-bottom: 10px;
        font-weight: bold;
      }
      table.data-table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 12px; 
        margin: 15px 0;
      }
      table.data-table td { 
        border: 1px solid #000; 
        padding: 8px 5px; 
        vertical-align: top; 
        font-size: 12px;
      }
      .profile-section { 
        display: flex; 
        align-items: flex-start; 
        gap: 20px; 
        margin: 20px 0;
      }
      .profile-image-container { 
        flex-shrink: 0; 
      }
      .profile-image { 
        height: 100px; 
        width: 100px; 
        object-fit: cover; 
        border: 1px solid #000; 
      }
      .footer-section {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
        padding-top: 20px;
      }
      .fingerprint-container {
        width: 45%;
      }
      .signature-container {
        width: 45%;
        text-align: right;
      }
      .fingerprint-image {
        height: 60px;
        width: 60px;
        object-fit: contain;
        border: 1px solid #000;
        margin-bottom: 10px;
      }
      .signature-line { 
        border-top: 1px solid #000; 
        width: 200px; 
        margin: 20px 0 5px 0; 
        display: inline-block;
      }
      .footer-label { 
        font-weight: bold; 
        margin-top: 5px;
        font-size: 12px;
      }
      .bidix-section {
        margin-top: 40px;
        text-align: right;
        font-weight: bold;
      }
      .no-print { 
        display: none !important; 
      }
      @page { 
        margin: 1cm; 
      }
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
          <div id="print-content">
            ${clonedContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    win.document.close();

    // Wait for images to load
    const imgs = win.document.images;
    if (imgs.length === 0) {
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 500);
      return;
    }

    let loaded = 0;
    const totalImages = imgs.length;
    
    const checkAllLoaded = () => {
      loaded++;
      if (loaded === totalImages) {
        setTimeout(() => {
          win.focus();
          win.print();
          win.close();
        }, 500);
      }
    };

    for (let i = 0; i < imgs.length; i++) {
      if (imgs[i].complete) {
        checkAllLoaded();
      } else {
        imgs[i].onload = imgs[i].onerror = checkAllLoaded;
      }
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

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

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
          {/* Header with 7 logos - Updated to match Word document */}
          <table className="document-header w-full mb-4">
            <tbody>
              <tr>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
                <td><img src={logo} alt="Logo" className="logo-img" /></td>
              </tr>
            </tbody>
          </table>

          {/* Document info with Feel No */}
          {record.feel_no && (
            <div className="document-info">
              FEEL NO: {record.feel_no}
            </div>
          )}

          {/* Title section */}
          <div className="header-title">SOMALI NATIONAL ARMED FORCES</div>
          <div className="header-subtitle">WAAXDA SAHANKA & SIRDOONKA TALISKA C.DHULKA XDS</div>
          <div className="header-line">LAANTA BAARISTA DANBIYADA EE WSW C.DHULKA XDS</div>
          <div className="header-line">MACLUUMAADKA LAGA QORA Y EEDEYSANE LAGU SOO EEDEEYEY QORI AK-47</div>
          
          {/* Date */}
          <div className="document-info mt-2">
            TAARIIKH: {currentDate}
          </div>

          {/* Profile card */}
          <div className="profile-section">
            {record.photo_url && (
              <div className="profile-image-container">
                {imageLoading ? (
                  <div className="h-24 w-24 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Record"
                    className="record-image h-24 w-24 object-cover rounded-lg border border-gray-300"
                    onError={() => setImageSrc(null)}
                  />
                ) : (
                  <div className="h-24 w-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                    No image
                  </div>
                )}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900">{record.full_name}</h2>
              {record.nickname && (
                <p className="text-gray-600">Nickname: {record.nickname}</p>
              )}
              <p className="text-gray-600">taariikhda lasoo xiray: {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          {/* Info Table - Updated to match Word document format */}
          <table className="data-table w-full mt-4">
            <tbody>
              <tr>
                <td className="font-medium">Magaca Hooyo</td>
                <td>{record.mothers_name || 'N/A'}</td>
                <td className="font-medium">Dhalashada</td>
                <td>{record.date_of_birth ? new Date(record.date_of_birth).toLocaleDateString() : 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Qabiil</td>
                <td>{record.tribe || 'N/A'}</td>
                <td className="font-medium">Telefoonka Waalidka</td>
                <td>{record.parent_phone || 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Telefoonka</td>
                <td>{record.phone || 'N/A'}</td>
                <td className="font-medium">Xaaladda Guurka</td>
                <td>{record.marital_status || 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Carruur</td>
                <td>{record.number_of_children || '0'}</td>
                <td className="font-medium">Deegaanka</td>
                <td>{record.residence || 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Waxbarasho</td>
                <td>{record.education_level || 'N/A'}</td>
                <td className="font-medium">Luuqadaha</td>
                <td>{record.languages_spoken || 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Xirfado</td>
                <td>{record.technical_skills || 'N/A'}</td>
                <td className="font-medium">Baasaaboorka</td>
                <td>{record.has_passport ? 'Haa' : 'Maya'}</td>
              </tr>
              <tr>
                <td className="font-medium">Xabsi hore</td>
                <td>{record.ever_arrested ? 'Haa' : 'Maya'}</td>
                <td className="font-medium">Goobta horey looka Xiray</td>
                <td>{record.arrest_location || 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Sababta horey looku soo Xiray</td>
                <td>{record.arrest_reason || 'N/A'}</td>
                <td className="font-medium">Taariikhda La Xiray</td>
                <td>{record.arrest_date ? new Date(record.arrest_date).toLocaleDateString() : 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-medium">Taliyaha/Laanta Xiray</td>
                <td colSpan="3">{record.arresting_authority || 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          {/* Additional details if available */}
          {record.additional_details && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded">
              <h4 className="font-semibold mb-2">Faahfaahin Dheeraad ah:</h4>
              <p>{record.additional_details}</p>
            </div>
          )}

          {/* Footer section with fingerprint and signature */}
          <div className="footer-section pt-6 border-t border-gray-400">
            {/* Fingerprint on left */}
            <div className="fingerprint-container">
              {record.fingerprint_url && (
                <>
                  {fingerprintLoading ? (
                    <div className="h-16 w-16 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  ) : fingerprintSrc ? (
                    <img
                      src={fingerprintSrc}
                      alt="Fingerprint"
                      className="fingerprint-image"
                      onError={() => setFingerprintSrc(null)}
                    />
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                      No fingerprint
                    </div>
                  )}
                </>
              )}
              {!record.fingerprint_url && (
                <div className="h-16 w-16 bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                  No fingerprint
                </div>
              )}
            </div>
            
            {/* Signature on right */}
            <div className="signature-container">
              <div className="signature-line"></div>
              <div className="footer-label">Saxiixa / Signature</div>
            </div>
          </div>

          {/* Bidix and Baare section */}
          <div className="bidix-section">
            <div>Bidix</div>
            {record.baare && (
              <div className="mt-2">Baare:- {record.baare}</div>
            )}
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

      {/* Print styles */}
      <style>{`
        @media print {
          body * { 
            visibility: hidden; 
          }
          #printable-record, #printable-record * { 
            visibility: visible; 
          }
          #printable-record { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            box-shadow: none; 
            border: none; 
            padding: 20px;
          }
          .no-print { 
            display: none !important; 
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewRecord;