import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AddRecord = () => {
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
    arrestingAuthority: '',
    feelNo: '',  // New field
    baare: ''    // New field
  });
  const [imageFile, setImageFile] = useState(null);
  const [fingerprintFile, setFingerprintFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fingerprintPreview, setFingerprintPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Function to handle unauthorized access
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear validation errors for this field when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors.filter(error => !error.toLowerCase().includes(name.toLowerCase())));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // New handler for fingerprint image
  const handleFingerprintChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Fingerprint image size must be less than 5MB');
        return;
      }
      
      setFingerprintFile(file);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFingerprintPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // In your AddRecord.js, update the handleSubmit function:

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError('');
  setValidationErrors([]);

  const token = getAuthToken();
  if (!token) {
    handleUnauthorized();
    return;
  }

  try {
    // Create FormData object to handle file upload
    const submitData = new FormData();
    
    // Append all form fields
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
      console.log(`Appending form field: ${key} = ${formData[key]}`);
    });
    
    // Append image file if exists
    if (imageFile) {
      console.log('Appending photo file:', imageFile.name, imageFile.type, imageFile.size);
      submitData.append('photo', imageFile, imageFile.name);
    }
    
    // Append fingerprint file if exists
    if (fingerprintFile) {
      console.log('Appending fingerprint file:', fingerprintFile.name, fingerprintFile.type, fingerprintFile.size);
      submitData.append('fingerprint', fingerprintFile, fingerprintFile.name);
    }

    // Log FormData contents for debugging
    console.log('FormData entries:');
    for (let [key, value] of submitData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File - ${value.name}, ${value.type}, ${value.size} bytes`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    // Send data to backend with authentication
    const response = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData
      },
      body: submitData,
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
      throw new Error(data.error || 'Failed to add record');
    }

    console.log('Record added successfully:', data);
    alert('Record added successfully!');
    
    // Redirect to records list page
    navigate('/records-list');
  } catch (error) {
    console.error('Error adding record:', error);
    setError(error.message);
    
    // Don't show alert for validation errors as they're displayed in the form
    if (!validationErrors.length) {
      alert(`Error: ${error.message}`);
    }
  } finally {
    setIsSubmitting(false);
  }
};

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
          </div>
        </header>

        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Add New Record</h2>
          
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
            {/* Column 1 */}
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
              {/* Profile Image Upload */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Upload Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-40 w-40 object-cover rounded-lg mb-4"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
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
                      <p className="text-gray-6 mb-2">Drag & drop a photo here or click to browse</p>
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
              
              {/* Fingerprint Image Upload */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Upload Fingerprint</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {fingerprintPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={fingerprintPreview}
                        alt="Fingerprint Preview"
                        className="h-32 w-32 object-cover rounded-lg mb-4"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFingerprintPreview(null);
                          setFingerprintFile(null);
                        }}
                        className="text-red-600 text-sm font-medium"
                      >
                        Remove Fingerprint
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
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        ></path>
                      </svg>
                      <p className="text-gray-6 mb-2">Drag & drop fingerprint image here or click to browse</p>
                      <label htmlFor="fingerprint-upload" className="cursor-pointer">
                        <span className="text-blue-600 font-medium">Browse files</span>
                        <input
                          id="fingerprint-upload"
                          name="fingerprint"
                          type="file"
                          accept="image/*"
                          onChange={handleFingerprintChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
              {/* New Fields */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Feel No (Document No)</label>
                <input
                  type="text"
                  name="feelNo"
                  value={formData.feelNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter document number"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">Baare (Investigator)</label>
                <input
                  type="text"
                  name="baare"
                  value={formData.baare}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter investigator name"
                />
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
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition duration-300 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Adding Record...' : 'Add Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;