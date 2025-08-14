"use client"
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';

// --- Zod Schemas for Validation (src/validation.ts) ---
// Aadhaar validation rules
const AadhaarSchema = z.string()
  .min(12, { message: 'Aadhaar must be 12 digits long.' })
  .max(12, { message: 'Aadhaar must be 12 digits long.' })
  .regex(/^\d+$/, { message: 'Aadhaar must contain only numbers.' });

// PAN validation rules
const PanSchema = z.string()
  .min(10, { message: 'PAN must be 10 characters long.' })
  .max(10, { message: 'PAN must be 10 characters long.' })
  .regex(/^[A-Z]{5}\d{4}[A-Z]{1}$/, { message: 'Invalid PAN format (e.g., ABCDE1234F).' });

// Date validation (DD/MM/YYYY)
const DateSchema = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Date format is DD/MM/YYYY.' })
  .refine((val) => {
    const [day, month, year] = val.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year && date <= today;
  }, { message: 'Invalid or future date.' });

// Combined form schema
const UdyamSchema = z.object({
  adharno: AadhaarSchema,
  ownername: z.string().min(1, { message: 'Name of Entrepreneur is required.' }).max(100, { message: 'Name cannot exceed 100 characters.' }),
  aadhaarDeclaration: z.boolean().refine(val => val, { message: 'You must agree to the Aadhaar declaration.' }),
  organizationType: z.string().refine(val => val !== '0', { message: 'Please select a type of organisation.' }),
  hasPan: z.enum(['yes', 'no']),
  pan: PanSchema.optional(),
  panName: z.string().min(1, { message: 'Name of PAN Holder is required.' }).max(100, { message: 'Name cannot exceed 100 characters.' }).optional(),
  dob: DateSchema.optional(),
  dobType: z.enum(['DOB', 'DOI']).optional(),
  panDeclaration: z.boolean().refine(val => val, { message: 'You must agree to the PAN declaration.' }).optional(),
  hasGstin: z.enum(['yes', 'no']).optional(),
  totalTurnoverA: z.number().optional(),
  totalTurnoverB: z.number().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation for PAN based on organization type
  const nonProprietaryOrgTypes = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const isPanRequired = nonProprietaryOrgTypes.includes(data.organizationType);

  if (isPanRequired && data.hasPan === 'no') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'PAN is mandatory for this type of organization. Please select "Yes".',
      path: ['hasPan'],
    });
  } else if (isPanRequired && data.hasPan === 'yes') {
    if (!data.pan) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PAN number is required.', path: ['pan'] });
    }
    if (!data.panName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name of PAN Holder is required.', path: ['panName'] });
    }
    if (!data.dob) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DOB or DOI is required.', path: ['dob'] });
    }
    if (!data.panDeclaration) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must agree to the PAN declaration.', path: ['panDeclaration'] });
    }
  }

  // Basic GSTIN conditional validation (simplified)
  if (data.hasGstin === 'no' && data.totalTurnoverA !== undefined && data.totalTurnoverA > 4000000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GSTIN is mandatory if turnover exceeds ₹40 Lakhs.',
      path: ['hasGstin'],
    });
  }
});

type UdyamFormData = z.infer<typeof UdyamSchema>;

// --- Component Data (Scraped Data) ---
const formFields = {
  inputs: [
    { name: "ctl00$ContentPlaceHolder1$txtadharno", id: "ctl00_ContentPlaceHolder1_txtadharno", type: "text", placeholder: "Your Aadhaar No", maxLength: "12" },
    { name: "ctl00$ContentPlaceHolder1$txtownername", id: "ctl00_ContentPlaceHolder1_txtownername", type: "text", placeholder: "Name as per Aadhaar", maxLength: "100" },
    { name: "ctl00$ContentPlaceHolder1$chkDecarationA", id: "ctl00_ContentPlaceHolder1_chkDecarationA", type: "checkbox" },
    { name: "ctl00$ContentPlaceHolder1$rbpanyesno", id: "ctl00_ContentPlaceHolder1_rbpanyesno_0", type: "radio", value: "yes" },
    { name: "ctl00$ContentPlaceHolder1$rbpanyesno", id: "ctl00_ContentPlaceHolder1_rbpanyesno_1", type: "radio", value: "no" },
    { name: "ctl00$ContentPlaceHolder1$txtPan", id: "ctl00_ContentPlaceHolder1_txtPan", type: "text", placeholder: "Enter Pan Number", maxLength: "10" },
    { name: "ctl00$ContentPlaceHolder1$txtPanName", id: "ctl00_ContentPlaceHolder1_txtPanName", type: "text", placeholder: "Name as per PAN", maxLength: "100" },
    { name: "ctl00$ContentPlaceHolder1$txtdob", id: "ctl00_ContentPlaceHolder1_txtdob", type: "text", placeholder: "DD/MM/YYYY" },
    { name: "ctl00$ContentPlaceHolder1$rbdDOB", id: "ctl00_ContentPlaceHolder1_rbdDOB_0", type: "radio", value: "DOB" },
    { name: "ctl00$ContentPlaceHolder1$rbdDOB_1", type: "radio", value: "DOI" },
    { name: "ctl00$ContentPlaceHolder1$chkDecarationP", id: "ctl00_ContentPlaceHolder1_chkDecarationP", type: "checkbox" },
    { name: "ctl00$ContentPlaceHolder1$rblWhetherGstn", id: "ctl00_ContentPlaceHolder1_rblWhetherGstn_0", type: "radio", value: "yes" },
    { name: "ctl00$ContentPlaceHolder1$rblWhetherGstn", id: "ctl00_ContentPlaceHolder1_rblWhetherGstn_1", type: "radio", value: "no" },
    { name: "ctl00$ContentPlaceHolder1$txtTotalTurnoverA", id: "ctl00_ContentPlaceHolder1_txtTotalTurnoverA", type: "text", placeholder: "Total Turnover (A)" },
    { name: "ctl00$ContentPlaceHolder1$txtTotalTurnoverB", id: "ctl00_ContentPlaceHolder1_txtTotalTurnoverB", type: "text", placeholder: "Total Turnover (B)" },
  ],
  labels: [
    { for: "ownernamee", text: "1. Aadhaar Number/ आधार संख्या" },
    { for: "ownernamee", text: "2. Name of Entrepreneur / उद्यमी का नाम" },
    { for: null, text: "4. Do you have PAN?" },
    { for: "ctl00_ContentPlaceHolder1_rbpanyesno_0", text: "Yes" },
    { for: "ctl00_ContentPlaceHolder1_rbpanyesno_1", text: "No" },
    { for: "pancard", text: "4.1 PAN/ पैन" },
    { for: "Ename", text: "4.1.1 Name of PAN Holder / पैन धारक का नाम" },
    { for: "dob", text: "4.1.2 DOB or DOI as per PAN / पैन के अनुसार जन्म तिथि या निगमन तिथि" },
    { for: null, text: "4.1.3 Do You Have DOB or DOI as per PAN/क्या आपके पास पैन के अनुसार जन्मतिथि या निगमन की तारीख है?" },
    { for: "ctl00_ContentPlaceHolder1_rbdDOB_0", text: "DOB" },
    { for: "ctl00_ContentPlaceHolder1_rbdDOB_1", text: "DOI" },
  ],
  dropdowns: [
    {
      name: "ctl00$ContentPlaceHolder1$ddlTypeofOrg",
      id: "ctl00_ContentPlaceHolder1_ddlTypeofOrg",
      options: [
        { value: "0", text: "Type of Organisation / संगठन के प्रकार" },
        { value: "1", text: "1. Proprietary / एकल स्वामित्व" },
        { value: "2", text: "2. Hindu Undivided Family / हिंदू अविभाजित परिवार (एचयूएफ)" },
        { value: "3", text: "3. Partnership / पार्टनरशिप" },
        { value: "4", text: "4. Co-Operative / सहकारी" },
        { value: "5", text: "5. Private Limited Company / प्राइवेट लिमिटेड कंपनी" },
        { value: "6", text: "6. Public Limited Company / पब्लिक लिमिटेड कंपनी" },
        { value: "7", text: "7. Self Help Group / स्वयं सहायता समूह" },
        { value: "9", text: "8. Limited Liability Partenership / सीमित दायित्व भागीदारी" },
        { value: "10", text: "9. Society / सोसाईटी" },
        { value: "11", text: "10. Trust / ट्रस्ट" },
        { value: "8", text: "11. Others / अन्य" }
      ]
    }
  ]
};

// Mock API endpoint for PostPin (replace with actual API call)
const fetchCityStateFromPincode = async (pincode: string) => {
  const mockData: { [key: string]: { city: string; state: string } } = {
    '110001': { city: 'New Delhi', state: 'Delhi' },
    '400001': { city: 'Mumbai', state: 'Maharashtra' },
    '700001': { city: 'Kolkata', state: 'West Bengal' },
  };
  return new Promise<{ city: string; state: string } | null>((resolve) => {
    setTimeout(() => {
      resolve(mockData[pincode] || null);
    }, 500);
  });
};

const App: React.FC = () => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setValue, trigger } = useForm<UdyamFormData>({
    resolver: zodResolver(UdyamSchema),
    defaultValues: {
      aadhaarDeclaration: true,
      hasPan: 'yes',
      organizationType: '0', // Default to placeholder
    }
  });

  const organizationType = watch('organizationType');
  const hasPan = watch('hasPan');
  const hasGstin = watch('hasGstin');
  const totalTurnoverA = watch('totalTurnoverA');

  const [currentStep, setCurrentStep] = useState(1);
  const [submissionMessage, setSubmissionMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pincode, setPincode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [isPanValidated, setIsPanValidated] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (pincode.length === 6 && /^\d+$/.test(pincode)) {
        setIsPincodeLoading(true);
        const data = await fetchCityStateFromPincode(pincode);
        if (data) {
          setCity(data.city);
          setState(data.state);
        } else {
          setCity('');
          setState('');
        }
        setIsPincodeLoading(false);
      } else {
        setCity('');
        setState('');
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [pincode]);

  const onSubmit = async (data: UdyamFormData) => {
    console.log("Final Form Data:", data);
    setSubmissionMessage(null);
    try {
      const response = await fetch('http://localhost:8000/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail[0]?.msg || 'Submission failed.');
      }

      const result = await response.json();
      setSubmissionMessage({ type: 'success', message: result.message });
    } catch (error: any) {
      console.error("Submission error:", error);
      setSubmissionMessage({ type: 'error', message: error.message || 'An error occurred during submission. Please try again.' });
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await trigger(['adharno', 'ownername', 'aadhaarDeclaration']);
      if (isValid) {
        // Here, you would make an API call to validate Aadhaar with OTP
        // For this example, we'll just move to the next step
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      const isValid = await trigger(['organizationType', 'hasPan']);
      if (isValid && hasPan === 'yes') {
        const panIsValid = await trigger(['pan', 'panName', 'dob', 'panDeclaration']);
        if (panIsValid) {
          setIsPanValidated(true);
          // Now you can proceed to the final step.
          setCurrentStep(3);
        } else {
          setSubmissionMessage({ type: 'error', message: 'Please correct the PAN details.' });
          setIsPanValidated(false);
        }
      } else if (isValid && hasPan === 'no') {
        // If PAN is not required, move to the next step directly
        setCurrentStep(3);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 2) setIsPanValidated(false); // Reset PAN validation if going back
    }
  };

  const getLabelText = (htmlFor: string | null, defaultText: string) => {
    const label = formFields.labels.find(l => l.for === htmlFor);
    return label ? label.text : defaultText;
  };

  const getDropdownOptions = (dropdownId: string) => {
    const dropdown = formFields.dropdowns.find(d => d.id === dropdownId);
    return dropdown ? dropdown.options : [];
  };

  const handleAadhaarKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const charCode = event.charCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  };

  const isPanRequired = React.useMemo(() => {
    const nonProprietaryOrgTypes = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    return nonProprietaryOrgTypes.includes(organizationType);
  }, [organizationType]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">UDYAM REGISTRATION FORM</h1>

        <div className="flex justify-around items-center mb-8">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {currentStep > 1 ? <CheckCircle size={20} /> : 1}
            </div>
            <span className="text-sm mt-2 text-gray-700">Aadhaar Verification</span>
          </div>
          <div className={`flex-grow h-1 bg-gray-300 mx-2 ${currentStep > 1 ? 'bg-blue-600' : ''}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {currentStep > 2 ? <CheckCircle size={20} /> : 2}
            </div>
            <span className="text-sm mt-2 text-gray-700">PAN & Details</span>
          </div>
          <div className={`flex-grow h-1 bg-gray-300 mx-2 ${currentStep > 2 ? 'bg-blue-600' : ''}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {3}
            </div>
            <span className="text-sm mt-2 text-gray-700">Final Submission</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Aadhaar Verification With OTP</h2>
              
              <div className="form-group">
                <label htmlFor="ctl00_ContentPlaceHolder1_txtadharno" className="block text-gray-700 text-sm font-bold mb-2">
                  {getLabelText("ownernamee", "1. Aadhaar Number/ आधार संख्या")}
                </label>
                <input
                  type="text"
                  id="ctl00_ContentPlaceHolder1_txtadharno"
                  placeholder="Your Aadhaar No"
                  maxLength={12}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('adharno')}
                  onKeyPress={handleAadhaarKeyPress}
                />
                {errors.adharno && <p className="text-red-500 text-xs italic mt-1">{errors.adharno.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="ctl00_ContentPlaceHolder1_txtownername" className="block text-gray-700 text-sm font-bold mb-2">
                  {getLabelText("ownernamee", "2. Name of Entrepreneur / उद्यमी का नाम")}
                </label>
                <input
                  type="text"
                  id="ctl00_ContentPlaceHolder1_txtownername"
                  placeholder="Name as per Aadhaar"
                  maxLength={100}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('ownername')}
                />
                {errors.ownername && <p className="text-red-500 text-xs italic mt-1">{errors.ownername.message}</p>}
              </div>

              <div className="form-group">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="ctl00_ContentPlaceHolder1_chkDecarationA"
                    className="mt-1 mr-2 rounded text-blue-600 focus:ring-blue-500"
                    {...register('aadhaarDeclaration')}
                  />
                  <label htmlFor="ctl00_ContentPlaceHolder1_chkDecarationA" className="text-gray-700 text-sm">
                    I, the holder of the above Aadhaar, hereby give my consent to Ministry of MSME, Government of India, for using my Aadhaar number as allotted by UIDAI for Udyam Registration. NIC / Ministry of MSME, Government of India, have informed me that my aadhaar data will not be stored/shared.
                  </label>
                </div>
                {errors.aadhaarDeclaration && <p className="text-red-500 text-xs italic mt-1">{errors.aadhaarDeclaration.message}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out shadow-md hover:shadow-lg flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  Validate & Generate OTP <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">PAN Verification & Other Details</h2>

              <div className="form-group">
                <label htmlFor="ctl00_ContentPlaceHolder1_ddlTypeofOrg" className="block text-gray-700 text-sm font-bold mb-2">
                  {getLabelText("Ename", "3. Type of Organisation / संगठन के प्रकार")}
                </label>
                <select
                  id="ctl00_ContentPlaceHolder1_ddlTypeofOrg"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('organizationType')}
                  onChange={() => setIsPanValidated(false)}
                >
                  {getDropdownOptions("ctl00_ContentPlaceHolder1_ddlTypeofOrg").map((option, index) => (
                    <option key={index} value={option.value}>
                      {option.text}
                    </option>
                  ))}
                </select>
                {errors.organizationType && <p className="text-red-500 text-xs italic mt-1">{errors.organizationType.message}</p>}
              </div>

              <div className="form-group">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  {getLabelText(null, "4. Do you have PAN?")}
                </label>
                <div className="flex items-center space-x-4">
                  <label htmlFor="ctl00_ContentPlaceHolder1_rbpanyesno_0" className="flex items-center text-gray-700 text-sm">
                    <input
                      type="radio"
                      id="ctl00_ContentPlaceHolder1_rbpanyesno_0"
                      value="yes"
                      className="rounded-full text-blue-600 focus:ring-blue-500"
                      {...register('hasPan')}
                      onChange={() => setIsPanValidated(false)}
                    />
                    <span className="ml-1">{getLabelText("ctl00_ContentPlaceHolder1_rbpanyesno_0", "Yes")}</span>
                  </label>
                  <label htmlFor="ctl00_ContentPlaceHolder1_rbpanyesno_1" className="flex items-center text-gray-700 text-sm">
                    <input
                      type="radio"
                      id="ctl00_ContentPlaceHolder1_rbpanyesno_1"
                      value="no"
                      className="rounded-full text-blue-600 focus:ring-blue-500"
                      {...register('hasPan')}
                      onChange={() => setIsPanValidated(false)}
                    />
                    <span className="ml-1">{getLabelText("ctl00_ContentPlaceHolder1_rbpanyesno_1", "No")}</span>
                  </label>
                </div>
                {errors.hasPan && <p className="text-red-500 text-xs italic mt-1">{errors.hasPan.message}</p>}
              </div>

              {hasPan === 'yes' && (
                <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                  <div className="form-group">
                    <label htmlFor="ctl00_ContentPlaceHolder1_txtPan" className="block text-gray-700 text-sm font-bold mb-2">
                      {getLabelText("pancard", "4.1 PAN/ पैन")}
                    </label>
                    <input
                      type="text"
                      id="ctl00_ContentPlaceHolder1_txtPan"
                      placeholder="Enter Pan Number"
                      maxLength={10}
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      {...register('pan')}
                      onChange={() => setIsPanValidated(false)}
                    />
                    {errors.pan && <p className="text-red-500 text-xs italic mt-1">{errors.pan.message}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="ctl00_ContentPlaceHolder1_txtPanName" className="block text-gray-700 text-sm font-bold mb-2">
                      {getLabelText("Ename", "4.1.1 Name of PAN Holder / पैन धारक का नाम")}
                    </label>
                    <input
                      type="text"
                      id="ctl00_ContentPlaceHolder1_txtPanName"
                      placeholder="Name as per PAN"
                      maxLength={100}
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                      {...register('panName')}
                      onChange={() => setIsPanValidated(false)}
                    />
                    {errors.panName && <p className="text-red-500 text-xs italic mt-1">{errors.panName.message}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="ctl00_ContentPlaceHolder1_txtdob" className="block text-gray-700 text-sm font-bold mb-2">
                      {getLabelText("dob", "4.1.2 DOB or DOI as per PAN / पैन के अनुसार जन्म तिथि या निगमन तिथि")}
                    </label>
                    <input
                      type="text"
                      id="ctl00_ContentPlaceHolder1_txtdob"
                      placeholder="DD/MM/YYYY"
                      className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                      {...register('dob')}
                      onChange={() => setIsPanValidated(false)}
                    />
                    {errors.dob && <p className="text-red-500 text-xs italic mt-1">{errors.dob.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      {getLabelText(null, "4.1.3 Do You Have DOB or DOI as per PAN/क्या आपके पास पैन के अनुसार जन्मतिथि या निगमन की तारीख है?")}
                    </label>
                    <div className="flex items-center space-x-4">
                      <label htmlFor="ctl00_ContentPlaceHolder1_rbdDOB_0" className="flex items-center text-gray-700 text-sm">
                        <input
                          type="radio"
                          id="ctl00_ContentPlaceHolder1_rbdDOB_0"
                          value="DOB"
                          className="rounded-full text-blue-600 focus:ring-blue-500"
                          {...register('dobType')}
                          onChange={() => setIsPanValidated(false)}
                        />
                        <span className="ml-1">{getLabelText("ctl00_ContentPlaceHolder1_rbdDOB_0", "DOB")}</span>
                      </label>
                      <label htmlFor="ctl00_ContentPlaceHolder1_rbdDOB_1" className="flex items-center text-gray-700 text-sm">
                        <input
                          type="radio"
                          id="ctl00_ContentPlaceHolder1_rbdDOB_1"
                          value="DOI"
                          className="rounded-full text-blue-600 focus:ring-blue-500"
                          {...register('dobType')}
                          onChange={() => setIsPanValidated(false)}
                        />
                        <span className="ml-1">{getLabelText("ctl00_ContentPlaceHolder1_rbdDOB_1", "DOI")}</span>
                      </label>
                    </div>
                    {errors.dobType && <p className="text-red-500 text-xs italic mt-1">{errors.dobType.message}</p>}
                  </div>

                  <div className="form-group">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="ctl00_ContentPlaceHolder1_chkDecarationP"
                        className="mt-1 mr-2 rounded text-blue-600 focus:ring-blue-500"
                        {...register('panDeclaration')}
                        onChange={() => setIsPanValidated(false)}
                      />
                      <label htmlFor="ctl00_ContentPlaceHolder1_chkDecarationP" className="text-gray-700 text-sm">
                        I, the holder of the above PAN, hereby give my consent to Ministry of MSME, Government of India, for using my data/ information available in the Income Tax Returns filed by me, and also the same available in the GST Returns and also from other Government organizations, for MSME classification and other official purposes, in pursuance of the MSMED Act, 2006.
                      </label>
                    </div>
                    {errors.panDeclaration && <p className="text-red-500 text-xs italic mt-1">{errors.panDeclaration.message}</p>}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200 ease-in-out shadow-md hover:shadow-lg flex items-center space-x-2"
                >
                  <ChevronRight size={18} className="rotate-180" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out shadow-md hover:shadow-lg flex items-center space-x-2"
                  disabled={isSubmitting || (isPanRequired && !isPanValidated)}
                >
                  Validate & Proceed <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Other Details & Final Submission</h2>
              
              <div className="form-group">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Do you have GSTIN?
                </label>
                <div className="flex items-center space-x-4">
                  <label htmlFor="ctl00_ContentPlaceHolder1_rblWhetherGstn_0" className="flex items-center text-gray-700 text-sm">
                    <input
                      type="radio"
                      id="ctl00_ContentPlaceHolder1_rblWhetherGstn_0"
                      value="yes"
                      className="rounded-full text-blue-600 focus:ring-blue-500"
                      {...register('hasGstin')}
                    />
                    <span className="ml-1">Yes</span>
                  </label>
                  <label htmlFor="ctl00_ContentPlaceHolder1_rblWhetherGstn_1" className="flex items-center text-gray-700 text-sm">
                    <input
                      type="radio"
                      id="ctl00_ContentPlaceHolder1_rblWhetherGstn_1"
                      value="no"
                      className="rounded-full text-blue-600 focus:ring-blue-500"
                      {...register('hasGstin')}
                    />
                    <span className="ml-1">No</span>
                  </label>
                </div>
                {errors.hasGstin && <p className="text-red-500 text-xs italic mt-1">{errors.hasGstin.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="ctl00_ContentPlaceHolder1_txtTotalTurnoverA" className="block text-gray-700 text-sm font-bold mb-2">
                  Total Turnover (A)
                </label>
                <input
                  type="number"
                  id="ctl00_ContentPlaceHolder1_txtTotalTurnoverA"
                  placeholder="Total Turnover (A)"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('totalTurnoverA', { valueAsNumber: true })}
                />
                {errors.totalTurnoverA && <p className="text-red-500 text-xs italic mt-1">{errors.totalTurnoverA.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="ctl00_ContentPlaceHolder1_txtTotalTurnoverB" className="block text-gray-700 text-sm font-bold mb-2">
                  Total Turnover (B)
                </label>
                <input
                  type="number"
                  id="ctl00_ContentPlaceHolder1_txtTotalTurnoverB"
                  placeholder="Total Turnover (B)"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('totalTurnoverB', { valueAsNumber: true })}
                />
                {errors.totalTurnoverB && <p className="text-red-500 text-xs italic mt-1">{errors.totalTurnoverB.message}</p>}
              </div>
              
              <div className="form-group">
                <label htmlFor="pincode" className="block text-gray-700 text-sm font-bold mb-2">
                  PIN Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="pincode"
                    placeholder="Enter PIN Code"
                    maxLength={6}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                  {isPincodeLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={20} />
                  )}
                </div>
              </div>

              {city && (
                <div className="form-group">
                  <label className="block text-gray-700 text-sm font-bold mb-2">City:</label>
                  <p className="text-gray-800">{city}</p>
                </div>
              )}
              {state && (
                <div className="form-group">
                  <label className="block text-gray-700 text-sm font-bold mb-2">State:</label>
                  <p className="text-gray-800">{state}</p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200 ease-in-out shadow-md hover:shadow-lg flex items-center space-x-2"
                >
                  <ChevronRight size={18} className="rotate-180" /> Back
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 ease-in-out shadow-md hover:shadow-lg flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Submitting...
                    </>
                  ) : (
                    <>
                      Submit Form <CheckCircle size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {submissionMessage && (
          <div className={`p-4 rounded-lg mt-4 text-center font-semibold ${submissionMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {submissionMessage.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;