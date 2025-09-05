import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_URL } from '../utils/api'; // adjust path if needed

const ViewRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image states (photo + fingerprint)
  const [photoSrc, setPhotoSrc] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [fingerprintSrc, setFingerprintSrc] = useState(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);

  // Auth helpers
  const getAuthToken = () => localStorage.getItem('token');
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper for file base (remove trailing /api if present)
  const baseForFiles = (API_URL || '').replace(/\/api\/?$/, '');

  // Flexible getter: try multiple possible field names (snake_case or camelCase)
  const getVal = (...keys) => {
    for (const k of keys) {
      if (!record) continue;
      const v = record[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
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

  // Generic protected file fetcher returning objectURL (used for photo & fingerprint)
  const fetchProtectedFile = async (fileUrlOrPath, setSrc, setLoadingFlag) => {
    if (!fileUrlOrPath) {
      setSrc(null);
      return;
    }

    setLoadingFlag(true);
    let objectUrl = null;
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const filePath = fileUrlOrPath.startsWith('http')
        ? fileUrlOrPath
        : `${baseForFiles}${fileUrlOrPath.startsWith('/') ? '' : '/'}${fileUrlOrPath}`;

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
        console.error('Protected file fetch failed:', res.status, text);
        throw new Error(`File fetch failed with status ${res.status}`);
      }

      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    } catch (err) {
      console.error('Error fetching protected file:', err);
      setSrc(null);
    } finally {
      setLoadingFlag(false);
      // cleanup handled by relevant effect's return if needed
    }

    // return objectUrl for potential revocation tracking
    return objectUrl;
  };

  // Fetch photo when record changes
  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    let objectUrl = null;

    (async () => {
      try {
        const photoField = getVal('photo_url', 'photo', 'photoUrl');
        if (!photoField) {
          setPhotoSrc(null);
          return;
        }
        setPhotoLoading(true);
        const token = getAuthToken();
        if (!token) {
          handleUnauthorized();
          return;
        }

        const filePath = photoField.startsWith('http')
          ? photoField
          : `${baseForFiles}${photoField.startsWith('/') ? '' : '/'}${photoField}`;

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
          console.error('Photo fetch failed:', res.status, text);
          setPhotoSrc(null);
          return;
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPhotoSrc(objectUrl);
      } catch (err) {
        console.error('Error fetching photo:', err);
        if (!cancelled) setPhotoSrc(null);
      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.photo_url, record?.photo, record?.photoUrl]);

  // Fetch fingerprint when record changes (supports fingerprint_url / fingerprint / fingerprintUrl)
  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    let objectUrl = null;

    (async () => {
      try {
        const fpField = getVal('fingerprint_url', 'fingerprint', 'fingerprintUrl', 'fingerprint_file');
        if (!fpField) {
          setFingerprintSrc(null);
          return;
        }
        setFingerprintLoading(true);
        const token = getAuthToken();
        if (!token) {
          handleUnauthorized();
          return;
        }

        const filePath = fpField.startsWith('http')
          ? fpField
          : `${baseForFiles}${fpField.startsWith('/') ? '' : '/'}${fpField}`;

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
          console.error('Fingerprint fetch failed:', res.status, text);
          setFingerprintSrc(null);
          return;
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setFingerprintSrc(objectUrl);
      } catch (err) {
        console.error('Error fetching fingerprint:', err);
        if (!cancelled) setFingerprintSrc(null);
      } finally {
        if (!cancelled) setFingerprintLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.fingerprint_url, record?.fingerprint, record?.fingerprintUrl, record?.fingerprint_file]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-record');
    if (!printContent) return;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
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

  // Helper to format dates gracefully
  const fmtDate = (val) => {
    if (!val) return 'N/A';
    try {
      return new Date(val).toLocaleDateString();
    } catch {
      return val;
    }
  };

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

        {/* Printable section (rewritten to match the Doc layout) */}
        <div id="printable-record" className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
          {/* Official header */}
          <div className="text-center mb-6">
            <p className="text-sm font-semibold">SOMALI NATIONAL ARMED FORCES</p>
            <p className="text-sm">WAAXDA  SAHANKA IYO SIRDOONKA CIIDANKA XDS</p>
            <p className="text-sm">LAANTA DABAGALKA & HUBINTA GUUD</p>
            <div className="mt-4">
              <h2 className="text-lg font-bold">WARQADA CADEYNTA HUBINTA GUUD EE CIIDANKA DHULKA XDS</h2>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>FEYL34</span>
                <span>TR : {fmtDate(new Date())}</span>
              </div>
            </div>
          </div>

          {/* Section: XOGTA QOFKA */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">XOGTA QOFKA</h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Left: labels + values in table style */}
              <div className="col-span-2">
                <table className="w-full text-sm border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="border px-4 py-2 font-medium w-1/3">MAGACA</td>
                      <td className="border px-4 py-2">{getVal('full_name', 'fullName') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">MAGACA HOOYADA</td>
                      <td className="border px-4 py-2">{getVal('mothers_name', 'mothersName') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">N/CIIDAN</td>
                      <td className="border px-4 py-2">{getVal('military_no', 'service_no', 'serviceNumber', 'n_ciidan') || getVal('id', 'id_number') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">DARAJADA</td>
                      <td className="border px-4 py-2">{getVal('rank', 'darrajada') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">JAGADA</td>
                      <td className="border px-4 py-2">{getVal('position', 'job_title', 'jagada') || 'Maya'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">COLKA</td>
                      <td className="border px-4 py-2">{getVal('unit', 'colka', 'unit_name') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">NAANEYS</td>
                      <td className="border px-4 py-2">{getVal('nickname', 'naanees') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">T/DHALASHADA</td>
                      <td className="border px-4 py-2">{fmtDate(getVal('date_of_birth', 'dateOfBirth', 'dob') || getVal('birth_year', 't_dhalashada'))}</td>
                    </tr>
                    <tr>
                      <td className="border px-4 py-2 font-medium">G/DHALASHADA</td>
                      <td className="border px-4 py-2">{getVal('birth_place', 'place_of_birth', 'g_dhalashada') || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right: images (photo + fingerprint) */}
              <div className="flex flex-col items-center gap-4">
                {/* Photo */}
                <div className="w-40 h-40 border border-gray-300 rounded overflow-hidden flex items-center justify-center">
                  {photoLoading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  ) : photoSrc ? (
                    <img src={photoSrc} alt="Photo" className="w-full h-full object-cover" onError={() => setPhotoSrc(null)} />
                  ) : (
                    <div className="text-xs text-gray-500 px-2 text-center">No photo available</div>
                  )}
                </div>

                {/* Fingerprint */}
                <div className="w-40 h-28 border border-gray-300 rounded overflow-hidden flex items-center justify-center bg-gray-50">
                  {fingerprintLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  ) : fingerprintSrc ? (
                    <img src={fingerprintSrc} alt="Fingerprint" className="max-w-full max-h-full object-contain" onError={() => setFingerprintSrc(null)} />
                  ) : (
                    <div className="text-xs text-gray-500 text-center p-2">
                      Placeholder for<br/>Fingerprint Image
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-600 text-center">Sawir & Far-gacmeed</div>
              </div>
            </div>
          </div>

          {/* Section: XOG DHEERAAD AH */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">XOG DHEERAAD AH</h3>
            <table className="w-full text-sm border border-gray-300">
              <tbody>
                <tr>
                  <td className="border px-4 py-2 font-medium">JINSIGA</td>
                  <td className="border px-4 py-2">{getVal('gender', 'jinsiga') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">DHIIGA</td>
                  <td className="border px-4 py-2">{getVal('blood_type', 'blood', 'dhiiga') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">JINSIYADA</td>
                  <td className="border px-4 py-2">{getVal('nationality', 'citizenship', 'jinsiyada') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">QABIILKA</td>
                  <td className="border px-4 py-2">{getVal('tribe', 'qabiilka') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">QOYSKA</td>
                  <td className="border px-4 py-2">{getVal('family_info', 'family', 'qooyska') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">TELL</td>
                  <td className="border px-4 py-2">{getVal('phone', 'tell') || getVal('phone_number') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">TELL WAALID</td>
                  <td className="border px-4 py-2">{getVal('parent_phone', 'tell_parent') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">EMAIL</td>
                  <td className="border px-4 py-2">{getVal('email') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">SANADKA TABARKA</td>
                  <td className="border px-4 py-2">{getVal('training_year', 'sanadka_tabarka') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">XIRFADA</td>
                  <td className="border px-4 py-2">{getVal('occupation', 'xirfada', 'technical_skills') || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Q&A style section (Su'aalo iyo Jawaabo) */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">SU'AALO IYO JAWAABO</h3>
            <table className="w-full text-sm border border-gray-300">
              <tbody>
                <tr>
                  <td className="border px-4 py-2 font-medium">ACCOUNT NUMBER</td>
                  <td className="border px-4 py-2">{getVal('account_number', 'accountNumber') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">XAALADA GUURKA</td>
                  <td className="border px-4 py-2">{getVal('marital_status', 'xaalada_guurka') || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">TIRADA CARUURTA</td>
                  <td className="border px-4 py-2">{getVal('number_of_children', 'tirada_caruurta') ?? '0'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">BAASABOOR MALEEDAHAY</td>
                  <td className="border px-4 py-2">{getVal('has_passport') ? (String(getVal('has_passport')) === 'true' ? 'Haa' : 'Maya') : 'Maya'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">BAASABOOR AMA SHARCI AJNABI AH</td>
                  <td className="border px-4 py-2">{getVal('has_foreign_doc') ? (String(getVal('has_foreign_doc')) === 'true' ? 'Haa' : 'Maya') : 'Maya'}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2 font-medium">INTEE COL AYAA LAGUU BADALAY</td>
                  <td className="border px-4 py-2">{getVal('unit_history', 'unit_changes') || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FAHFAAHIN narrative */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 mb-2">FAAHFAAHIN</h3>
            <div className="border p-4 text-sm text-gray-700 min-h-[80px]">
              {getVal('details', 'narrative', 'faahfaahin') || 'Wadarta macluumaad dheeraad ah halkan ka muuqan doonto.'}
            </div>
          </div>

          {/* Signature block */}
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="mb-12">&nbsp;</div>
              <div className="border-t border-gray-400 pt-2 text-sm">SAXIIXA BAARAHA</div>
            </div>

            <div className="text-center">
              <div className="mb-12">&nbsp;</div>
              <div className="border-t border-gray-400 pt-2 text-sm">SAXIIXA CIIDANKA / SHAQSIGA</div>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>This is an official document from the Government Record Management System</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 no-print">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate(`/edit-record/${getVal('id', 'record_id', 'id_number') || getVal('id')}`)}
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
