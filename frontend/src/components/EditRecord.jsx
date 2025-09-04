import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EditRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    mothersName: '',
    dateOfBirth: '',
    tribe: '',
    parentPhone: '',
    phone: '',
    maritalStatus: '',
    numberOfChildren: 0,
    residence: '',
    educationLevel: '',
    languages: '',
    technicalSkills: '',
    additionalDetails: '',
    hasPassport: 'false',
    everArrested: 'false',
    arrestLocation: '',
    arrestReason: '',
    arrestDate: '',
    arrestingAuthority: ''
  });

  const [imageFile, setImageFile] = useState(null);          // selected new file
  const [localPreview, setLocalPreview] = useState(null);    // data URL for selected file
  const [serverImageUrl, setServerImageUrl] = useState(null);// object URL from server blob
  const [imageLoading, setImageLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]); // New state for validation errors
  const [loading, setLoading] = useState(true);

  const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:5000';

  // Function to get auth token
  const getAuthToken = () => localStorage.getItem('token');

  // Function to handle unauthorized access
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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

        const response = await fetch(`${API_URL}/api/records/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch record');

        const data = await response.json();
        if (cancelled) return;

        // populate form
        setFormData({
          fullName: data.full_name || '',
          nickname: data.nickname || '',
          mothersName: data.mothers_name || '',
          dateOfBirth: data.date_of_birth || '',
          tribe: data.tribe || '',
          parentPhone: data.parent_phone || '',
          phone: data.phone || '',
          maritalStatus: data.marital_status || '',
          numberOfChildren: data.number_of_children || 0,
          residence: data.residence || '',
          educationLevel: data.education_level || '',
          languages: data.languages_spoken || '',
          technicalSkills: data.technical_skills || '',
          additionalDetails: data.additional_details || '',
          hasPassport: data.has_passport ? 'true' : 'false',
          everArrested: data.ever_arrested ? 'true' : 'false',
          arrestLocation: data.arrest_location || '',
          arrestReason: data.arrest_reason || '',
          arrestDate: data.arrest_date || '',
          arrestingAuthority: data.arresting_authority || ''
        });

        // if there's an existing image on the server, fetch it as blob and create object URL
        if (data.photo_url) {
          // cleanup previous server URL if any
          if (serverImageUrl) {
            URL.revokeObjectURL(serverImageUrl);
            setServerImageUrl(null);
          }

          setImageLoading(true);
          try {
            const filePath = data.photo_url.startsWith('http') 
              ? data.photo_url 
              : `${API_URL}${data.photo_url.startsWith('/') ? '' : '/'}${data.photo_url}`;

            const imgRes = await fetch(filePath, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (imgRes.status === 401) {
              handleUnauthorized();
              return;
            }

            if (!imgRes.ok) throw new Error(`Image fetch failed ${imgRes.status}`);

            const blob = await imgRes.blob();
            const objUrl = URL.createObjectURL(blob);
            if (!cancelled) setServerImageUrl(objUrl);
          } catch (imgErr) {
            console.error('Error fetching existing image:', imgErr);
            if (!cancelled) setServerImageUrl(null);
          } finally {
            if (!cancelled) setImageLoading(false);
          }
        } else {
          setServerImageUrl(null);
        }
      } catch (err) {
        console.error('Error fetching record:', err);
        if (!cancelled) setError('Failed to load record. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecord();

    return () => {
      cancelled = true;
      // cleanup any created object URL
      if (serverImageUrl) {
        URL.revokeObjectURL(serverImageUrl);
        setServerImageUrl(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // run once per id

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation errors for this field when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors.filter(error => !error.toLowerCase().includes(name.toLowerCase())));
    }
  };

  // When user chooses a new image file
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // size check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // revoke previous local preview if any
    if (localPreview) {
      setLocalPreview(null);
    }
    // revoke previous server object url (we'll still keep it but new local preview takes precedence)
    if (serverImageUrl) {
      URL.revokeObjectURL(serverImageUrl);
      setServerImageUrl(null);
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreview(reader.result); // data URL
    };
    reader.readAsDataURL(file);
  };

  // Remove selected/new image (keeps server image untouched unless you want delete)
  const handleRemoveSelectedImage = () => {
    setImageFile(null);
    setLocalPreview(null);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setValidationErrors([]); // Clear previous validation errors

    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
      if (imageFile) submitData.append('photo', imageFile);

      const response = await fetch(`${API_URL}/api/records/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: submitData
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle validation errors (status 400)
        if (response.status === 400 && data.errors) {
          setValidationErrors(data.errors);
          throw new Error('Please fix the validation errors');
        }
        
        // Handle other errors
        throw new Error(data.error || 'Failed to update record');
      }

      console.log('Record updated successfully:', data);
      alert('Record updated successfully!');
      navigate(`/record/${id}`);
    } catch (err) {
      console.error('Error updating record:', err);
      setError(err.message || 'Failed to update record');
      
      // Don't show alert for validation errors as they're displayed in the form
      if (!validationErrors.length) {
        alert(`Error: ${err.message || 'Failed to update record'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading record...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 uppercase">Government Record Management System</h1>
              <p className="text-gray-600">Manage person records efficiently</p>
            </div>
            <button
              onClick={() => navigate(`/record/${id}`)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </header>

        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Edit Record</h2>

          {error && !validationErrors.length && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}
          
          {/* Display validation errors */}
          {validationErrors.length > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
              <h3 className="font-bold mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 (fields) */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Magaca oo Afaran (Full Name) *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Nickname</label>
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter nickname"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Magaca Hooyada (Mother's Name)</label>
                <input
                  type="text"
                  name="mothersName"
                  value={formData.mothersName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter mother's name"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Taariikhda Dhalashada (Date of Birth)</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Qabiilka (Tribe)</label>
                <input
                  type="text"
                  name="tribe"
                  value={formData.tribe}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tribe"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Taleefonka Waalidka (Parent Phone)</label>
                <input
                  type="tel"
                  name="parentPhone"
                  value={formData.parentPhone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter parent phone number"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Taleefonka (Phone)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Xaalada Guurka (Marital Status)</label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select marital status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Tirada Caruurta (Number of Children)</label>
                <input
                  type="number"
                  name="numberOfChildren"
                  value={formData.numberOfChildren}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter number of children"
                  min="0"
                />
              </div>
            </div>

            {/* Column 2 - with image upload */}
            <div className="space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Upload Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {localPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={localPreview}
                        alt="Preview"
                        className="h-40 w-40 object-cover rounded-lg mb-4"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveSelectedImage}
                        className="text-red-600 text-sm font-medium"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : imageLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : serverImageUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={serverImageUrl}
                        alt="Existing"
                        className="h-40 w-40 object-cover rounded-lg mb-4"
                        onError={() => { URL.revokeObjectURL(serverImageUrl); setServerImageUrl(null); }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // If user wants to remove existing image visually (doesn't delete on backend)
                          URL.revokeObjectURL(serverImageUrl);
                          setServerImageUrl(null);
                        }}
                        className="text-red-600 text-sm font-medium"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <svg
                        className="w-16 h-16 text-gray-400 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                      <p className="text-gray-600 mb-2">Drag & drop a photo here or click to browse</p>
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <span className="text-blue-600 font-medium">Browse files</span>
                        <input
                          id="photo-upload"
                          name="photo"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Goobta Uu Daganyahay (Place of Residence)</label>
                <input
                  type="text"
                  name="residence"
                  value={formData.residence}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter place of residence"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Heerka Agoonta (Education Level)</label>
                <select
                  name="educationLevel"
                  value={formData.educationLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select education level</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="master">Master's Degree</option>
                  <option value="phd">PhD</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Lugadaha Uu Ku Hadlo (Languages Spoken)</label>
                <input
                  type="text"
                  name="languages"
                  value={formData.languages}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter languages spoken"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Xirfada Gearka Ah (Technical Skills)</label>
                <textarea
                  name="technicalSkills"
                  value={formData.technicalSkills}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter technical skills"
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Faahfaahin Dheeraad ah (Additional Details)</label>
                <textarea
                  name="additionalDetails"
                  value={formData.additionalDetails}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any additional information"
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Baasaboor Ma Leedahay (Has Passport?)</label>
                <div className="flex space-x-4 mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="hasPassport"
                      value="true"
                      checked={formData.hasPassport === 'true'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Yes</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="hasPassport"
                      value="false"
                      checked={formData.hasPassport === 'false'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Waligaa Ma lagu soxiray (Ever Arrested?)</label>
                <div className="flex space-x-4 mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="everArrested"
                      value="true"
                      checked={formData.everArrested === 'true'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Yes</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="everArrested"
                      value="false"
                      checked={formData.everArrested === 'false'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">No</span>
                  </label>
                </div>
              </div>

              {formData.everArrested === 'true' && (
                <>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Soobta Laga Soo Xiray (Arrest Location)</label>
                    <input
                      type="text"
                      name="arrestLocation"
                      value={formData.arrestLocation}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter arrest location"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Sababta Loo Soo Xiray (Arrest Reason)</label>
                    <input
                      type="text"
                      name="arrestReason"
                      value={formData.arrestReason}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter arrest reason"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Taarilkhada La Soo Xiray (Arrest Date)</label>
                    <input
                      type="date"
                      name="arrestDate"
                      value={formData.arrestDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Cida Soo Xiray (Arresting Authority)</label>
                    <input
                      type="text"
                      name="arrestingAuthority"
                      value={formData.arrestingAuthority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter arresting authority"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 border-t pt-6 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition duration-300 mr-4"
              >
                {isSubmitting ? 'Updating Record...' : 'Update Record'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/record/${id}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg transition duration-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRecord;