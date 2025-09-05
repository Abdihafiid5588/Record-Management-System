import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_URL } from '../utils/api'; // adjust if needed

const ViewRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image states
  const [imageSrc, setImageSrc] = useState(null); // photo
  const [imageLoading, setImageLoading] = useState(false);

  // Fingerprint states
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

  // Fetch protected image as blob and convert to object URL (photo)
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.photo_url]);

  // Fetch fingerprint as blob (if present)
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
        console.error('Error fetching fingerprint image:', err);
        if (!cancelled) setFingerprintSrc(null);
      } finally {
        if (!cancelled) setFingerprintLoading(false);
      }
    };

    fetchFingerprint();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.fingerprint_url]);

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

  // small helper to display boolean as Haa/Maya
  const yesNo = (val) => (val === true || val === 'true' || val === 'yes' || val === 'Haa' ? 'Haa' : 'Maya');

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
          {/* Header that mimics the official paper */}
          <div className="text-center border-b pb-4 mb-6">
            <p className="text-sm font-semibold">SOMALI NATIONAL ARMED FORCES</p>
            <p className="text-sm">WAAXDA SAHANKA IYO SIRDOONKA CIIDANKA XDS</p>
            <p className="text-sm">LAANTA DABAGALKA &amp; HUBINTA GUUD</p>
            <h2 className="text-lg font-bold mt-2">WARQADA CADEYNTA HUBINTA GUUD EE CIIDANKA</h2>
            <p className="text-sm text-gray-600 mt-2">FEYL34 &nbsp;&nbsp;&nbsp; TR : {record.reference_number || '—'}</p>
          </div>

          {/* Top info row: Photo + basic ID */}
          <div className="flex gap-6 mb-6">
            <div className="w-36 h-36 flex items-center justify-center bg-gray-100 border border-gray-300 rounded">
              {imageLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : imageSrc ? (
                <img src={imageSrc} alt="photo" className="object-cover w-full h-full rounded" onError={() => setImageSrc(null)} />
              ) : (
                <div className="text-xs text-gray-500 text-center px-2">No photo</div>
              )}
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold">MAGACA</div>
                <div>{record.full_name || record.fullName || '—'}</div>

                <div className="font-semibold">NAANEYS</div>
                <div>{record.nickname || '—'}</div>

                <div className="font-semibold">MAGACA HOOYADA</div>
                <div>{record.mothers_name || record.mothersName || '—'}</div>

                <div className="font-semibold">N/CIIDAN</div>
                <div>{record.service_number || record.nciidan || record.unit_number || '—'}</div>

                <div className="font-semibold">DARAJADA</div>
                <div>{record.rank || record.darajada || '—'}</div>

                <div className="font-semibold">JAGADA</div>
                <div>{record.position || record.jagada || '—'}</div>

                <div className="font-semibold">T/DHALASHADA</div>
                <div>{record.date_of_birth ? new Date(record.date_of_birth).toLocaleDateString() : (record.t_dhalashada || '—')}</div>

                <div className="font-semibold">G/DHALASHADA</div>
                <div>{record.birth_place || record.g_dhalashada || '—'}</div>
              </div>
            </div>

            {/* Fingerprint box */}
            <div className="w-36 flex flex-col items-center">
              <div className="text-xs font-semibold mb-2">FINGERPRINT</div>
              <div className="w-28 h-28 border border-gray-400 bg-gray-50 flex items-center justify-center">
                {fingerprintLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                ) : fingerprintSrc ? (
                  <img src={fingerprintSrc} alt="fingerprint" className="object-contain w-full h-full" onError={() => setFingerprintSrc(null)} />
                ) : (
                  <div className="text-xs text-gray-500 text-center px-1">Fingerprint</div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2">{record.fingerprint_note || ''}</div>
            </div>
          </div>

          {/* big detail table (two-column like the doc) */}
          <div className="text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="font-semibold py-1">JINSIGA</td><td>{record.gender || record.jinsi || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">DHIIGA</td><td>{record.blood_group || record.dhiiga || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">JINSIYADA</td><td>{record.nationality || record.jinsiyaad || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">QABIILKA</td><td>{record.tribe || record.qabiilka || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">QOYSKA</td><td>{record.family_details || record.qoyska || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">TELL</td><td>{record.phone || record.tell || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">TELL WAALID</td><td>{record.parent_phone || record.tell_waalid || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">EMAIL</td><td>{record.email || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">SANADKA TABARKA</td><td>{record.training_year || record.sanadka_tabarka || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">XIRFADA</td><td>{record.technical_skills || record.xirfada || '—'}</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="font-semibold py-1">ACCOUNT NUMBER</td><td>{record.account_number || record.accountNumber || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">XAALADA GUURKA</td><td>{record.marital_status ? yesNo(record.marital_status) : '—'}</td></tr>
                    <tr><td className="font-semibold py-1">TIRADA CARUURTA</td><td>{record.number_of_children || record.tirada_caruurt || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">XAGEE KU SOO QAADATAY</td><td>{record.recruitment_place || record.recruitment || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">DADKA SIDA FIICAN KUU YAQAANA</td><td>{record.references || record.known_people || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">GOOB DEEGAANKAAGA HADA</td><td>{record.residence || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">HEERKA WAXBARASHADA</td><td>{record.education_level || record.educationLevel || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">LUQADAHA AAD TAQAAN</td><td>{record.languages_spoken || record.languages || '—'}</td></tr>
                    <tr><td className="font-semibold py-1">BAASABOOR MALEEDAHAY</td><td>{record.has_passport ? yesNo(record.has_passport) : 'Maya'}</td></tr>
                    <tr><td className="font-semibold py-1">FAAHFAAHIN</td><td>{record.additional_details || record.faaahinta || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* conditional arrest fields (if ever arrested) */}
          {record.ever_arrested && (record.ever_arrested === true || record.ever_arrested === 'true' || record.ever_arrested === 'Haa') && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Xog Xabsiga / Xiritaanka</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold">Goobta</span>: {record.arrest_location || '—'}</div>
                <div><span className="font-semibold">Sababta</span>: {record.arrest_reason || '—'}</div>
                <div><span className="font-semibold">Taariikhda</span>: {record.arrest_date ? new Date(record.arrest_date).toLocaleDateString() : '—'}</div>
                <div><span className="font-semibold">Taliyaha</span>: {record.arresting_authority || '—'}</div>
              </div>
            </div>
          )}

          {/* Footer & signature */}
          <div className="mt-8 border-t pt-6 text-sm">
            <p className="mb-6">Anigoo ah: <span className="font-semibold">{record.rank ? `${record.rank} ${record.full_name || record.fullName}` : (record.full_name || record.fullName)}</span></p>

            <div className="flex justify-between items-end">
              <div className="text-sm">
                <div className="border-t w-64 pt-2">SAXIIXA BAARAHA</div>
                <div className="text-xs text-gray-500 mt-1">Date: {record.verified_date ? new Date(record.verified_date).toLocaleDateString() : new Date().toLocaleDateString()}</div>
              </div>

              <div className="text-right text-xs text-gray-500">
                <div>This is an official document from the Government Record Management System</div>
                <div className="mt-4">Document printed: {new Date().toLocaleDateString()}</div>
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
