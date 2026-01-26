import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

// Uttar Pradesh Districts List
const UP_DISTRICTS = [
    'Ghazipur',
    'Varanasi',
    'Mau',
    'Ballia',
    'Azamgarh'
]

export default function NewApplication({ session, applicationId = null, mode = 'create' }) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [locationLoading, setLocationLoading] = useState(false)
    const [prefillLoading, setPrefillLoading] = useState(false)

    const isEditMode = Boolean(applicationId)

    const [form, setForm] = useState({
        // Applicant
        applicant_name: '',
        mobile_number: '',
        email_id: '',

        // Solar plant
        solar_plant_type: 'Residential',
        solar_system_type: 'TATA On-Grid',
        plant_category: 'Residential',
        plant_size_kw: '',
        plant_price: '',

        // Location
        district: '',
        installation_pincode: '',
        site_address: '',
        site_latitude: '',
        site_longitude: '',

        // Meter details
        meter_type: 'Electric Meter',

        // Special flags
        name_correction_required: 'Not Required',
        correct_name: '',
        load_enhancement_required: 'Not Required',
        current_load: '',
        required_load: '',

        // COT
        cot_required: 'No',
        cot_type: '',
        cot_documents: '',

        // Payment details
        payment_mode: 'Cash',
        advance_payment_mode: 'Cash',
        upi_type: 'Company',
        margin_money: '',
        special_finance_required: 'No',

        // Plant structure
        building_floor_number: '',
        structure_type: '',
        structure_length: '',
        structure_height: '',
        free_shadow_area: '',

        // Feasibility
        installation_date_feasible: '',

        // System
        application_status: 'DRAFT',
    })

    const [files, setFiles] = useState({
        aadhaar_front: null,
        aadhaar_back: null,
        pan_card: null,
        electric_bill: null,
        smart_meter_doc: null,
        cancel_cheque: null,
        bank_details_doc: null,
    })

    const [cotFiles, setCotFiles] = useState({
        death_certificate: null,
        house_papers: null,
        passport_photo: null,
        family_registration: null,
        aadhaar_photos: [],
        live_to_live_aadhaar_1: null,
        live_to_live_aadhaar_2: null
    })

    const [cotPreviews, setCotPreviews] = useState({
        death_certificate: null,
        house_papers: null,
        passport_photo: null,
        family_registration: null,
        aadhaar_photos: [],
        live_to_live_aadhaar_1: null,
        live_to_live_aadhaar_2: null
    })

    const [previews, setPreviews] = useState({})
    const [blurStatus, setBlurStatus] = useState({})

    // Auto-set payment mode to Finance when finance is required
    useEffect(() => {
        if (form.special_finance_required === 'Yes') {
            setForm(f => ({ ...f, payment_mode: 'Finance' }))
        }
    }, [form.special_finance_required])

    // Prefill existing application when editing a draft
    useEffect(() => {
        if (!isEditMode) return

        const loadApplication = async () => {
            try {
                setPrefillLoading(true)
                const res = await fetch(`${API_BASE}/applications/${applicationId}`)
                if (!res.ok) {
                    setMsg('Unable to load application for editing')
                    setPrefillLoading(false)
                    return
                }
                const data = await res.json()

                setForm((f) => ({
                    ...f,
                    applicant_name: data.applicant_name || '',
                    mobile_number: data.mobile_number || '',
                    email_id: data.email_id || '',
                    solar_plant_type: data.solar_plant_type || 'Residential',
                    solar_system_type: data.solar_system_type || 'TATA On-Grid',
                    plant_category: data.plant_category || 'Residential',
                    plant_size_kw: data.plant_size_kw || '',
                    plant_price: data.plant_price || '',
                    district: data.district || '',
                    installation_pincode: data.installation_pincode || '',
                    site_address: data.site_address || '',
                    site_latitude: data.site_latitude || '',
                    site_longitude: data.site_longitude || '',
                    meter_type: data.meter_type || 'Electric Meter',
                    name_correction_required: data.name_correction_required || 'Not Required',
                    correct_name: data.correct_name || '',
                    load_enhancement_required: data.load_enhancement_required || 'Not Required',
                    current_load: data.current_load || '',
                    required_load: data.required_load || '',
                    cot_required: data.cot_required || 'No',
                    cot_type: data.cot_type || '',
                    cot_documents: data.cot_documents || '',
                    payment_mode: data.payment_mode || 'Cash',
                    advance_payment_mode: data.advance_payment_mode || 'Cash',
                    upi_type: data.upi_type || 'Company',
                    margin_money: data.margin_money || '',
                    special_finance_required: data.special_finance_required || 'No',
                    building_floor_number: data.building_floor_number || '',
                    structure_type: data.structure_type || '',
                    structure_length: data.structure_length || '',
                    structure_height: data.structure_height || '',
                    free_shadow_area: data.free_shadow_area || '',
                    installation_date_feasible: data.installation_date_feasible ? String(data.installation_date_feasible).slice(0, 10) : '',
                    application_status: data.application_status || 'DRAFT',
                }))

                // Populate previews from existing document URLs
                const existingPreviews = {}
                if (data.aadhaar_front_url) existingPreviews.aadhaar_front = `http://localhost:4000${data.aadhaar_front_url}`
                if (data.aadhaar_back_url) existingPreviews.aadhaar_back = `http://localhost:4000${data.aadhaar_back_url}`
                if (data.pan_card_url) existingPreviews.pan_card = `http://localhost:4000${data.pan_card_url}`
                if (data.electric_bill_url) existingPreviews.electric_bill = `http://localhost:4000${data.electric_bill_url}`
                if (data.bank_passbook_url) existingPreviews.bank_passbook = `http://localhost:4000${data.bank_passbook_url}`
                if (data.other_document_url) existingPreviews.other_document = `http://localhost:4000${data.other_document_url}`
                if (data.building_photo_url) existingPreviews.building_photo = `http://localhost:4000${data.building_photo_url}`
                if (data.meter_room_photo_url) existingPreviews.meter_room_photo = `http://localhost:4000${data.meter_room_photo_url}`
                if (data.selfie_url) existingPreviews.selfie = `http://localhost:4000${data.selfie_url}`

                if (Object.keys(existingPreviews).length > 0) {
                    setPreviews(existingPreviews)
                }
            } catch (err) {
                console.error('Prefill error', err)
                setMsg('Unable to load application for editing')
            } finally {
                setPrefillLoading(false)
            }
        }

        loadApplication()
    }, [isEditMode, applicationId])

    const onChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    }

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMsg('Geolocation is not supported by your browser')
            return
        }

        setLocationLoading(true)
        setMsg('Getting GPS location...')

        // First try with high accuracy
        const tryGetLocation = (highAccuracy, retryCount = 0) => {
            const options = {
                enableHighAccuracy: highAccuracy,
                timeout: highAccuracy ? 15000 : 30000, // 15s for high accuracy, 30s for low
                maximumAge: 0 // Don't use cached position
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords
                    console.log(`GPS Location obtained: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                            { headers: { 'User-Agent': 'SolarCRM/1.0' } }
                        )
                        const data = await response.json()

                        const address = data.display_name || ''
                        const pincode = data.address?.postcode || ''

                        setForm((f) => ({
                            ...f,
                            site_latitude: latitude.toFixed(6),
                            site_longitude: longitude.toFixed(6),
                            // Only update site_address if it's empty (don't overwrite manual entry)
                            site_address: f.site_address || address,
                            installation_pincode: pincode || f.installation_pincode,
                        }))
                        setMsg(`Location captured successfully! (Accuracy: ${Math.round(accuracy)}m)`)
                    } catch (err) {
                        console.error('Reverse geocoding failed:', err)
                        setForm((f) => ({
                            ...f,
                            site_latitude: latitude.toFixed(6),
                            site_longitude: longitude.toFixed(6),
                        }))
                        setMsg(`Location coordinates captured! (Accuracy: ${Math.round(accuracy)}m)`)
                    }
                    setLocationLoading(false)
                },
                (error) => {
                    console.error('Geolocation error:', error.code, error.message)

                    // If high accuracy failed, try with low accuracy
                    if (highAccuracy && retryCount < 1) {
                        console.log('High accuracy failed, trying with low accuracy...')
                        setMsg('Trying alternative GPS method...')
                        tryGetLocation(false, retryCount + 1)
                        return
                    }

                    // Provide specific error messages
                    let errorMsg = 'Unable to get location. '
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg += 'Please allow location access in your browser/device settings.'
                            break
                        case error.POSITION_UNAVAILABLE:
                            errorMsg += 'Location information unavailable. Please ensure GPS is enabled.'
                            break
                        case error.TIMEOUT:
                            errorMsg += 'Location request timed out. Please try again in an open area.'
                            break
                        default:
                            errorMsg += 'Please check GPS permissions and try again.'
                    }
                    setMsg(errorMsg)
                    setLocationLoading(false)
                },
                options
            )
        }

        // Start with high accuracy
        tryGetLocation(true)
    }

    const checkImageBlur = async (file) => {
        return new Promise((resolve) => {
            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const data = imageData.data
                let edgeCount = 0
                const threshold = 30

                for (let i = 0; i < data.length; i += 16) {
                    if (i + 4 < data.length) {
                        const diff = Math.abs(data[i] - data[i + 4])
                        if (diff > threshold) edgeCount++
                    }
                }

                const blurThreshold = (canvas.width * canvas.height) / 1000
                const isBlurry = edgeCount < blurThreshold

                URL.revokeObjectURL(url)
                resolve(isBlurry)
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                resolve(false)
            }

            img.src = url
        })
    }

    const onFile = async (name, file) => {
        if (!file) return

        const isBlurry = await checkImageBlur(file)
        const previewUrl = URL.createObjectURL(file)

        setPreviews((prev) => ({ ...prev, [name]: previewUrl }))
        setBlurStatus((prev) => ({ ...prev, [name]: isBlurry }))
        setFiles((prev) => ({ ...prev, [name]: file }))
    }

    const retakePhoto = (name) => {
        if (previews[name]) {
            URL.revokeObjectURL(previews[name])
        }
        setPreviews((prev) => ({ ...prev, [name]: null }))
        setBlurStatus((prev) => ({ ...prev, [name]: false }))
        setFiles((prev) => ({ ...prev, [name]: null }))
    }

    const onCotFile = (name, file) => {
        if (!file) return
        const previewUrl = URL.createObjectURL(file)
        setCotPreviews((prev) => ({ ...prev, [name]: previewUrl }))
        setCotFiles((prev) => ({ ...prev, [name]: file }))
    }

    const addAadhaarPhoto = () => {
        if (cotFiles.aadhaar_photos.length < 6) {
            setCotFiles(prev => ({
                ...prev,
                aadhaar_photos: [...prev.aadhaar_photos, null]
            }))
            setCotPreviews(prev => ({
                ...prev,
                aadhaar_photos: [...prev.aadhaar_photos, null]
            }))
        }
    }

    const onAadhaarPhoto = (index, file) => {
        if (!file) return
        const previewUrl = URL.createObjectURL(file)

        setCotFiles(prev => {
            const newPhotos = [...prev.aadhaar_photos]
            newPhotos[index] = file
            return { ...prev, aadhaar_photos: newPhotos }
        })

        setCotPreviews(prev => {
            const newPreviews = [...prev.aadhaar_photos]
            newPreviews[index] = previewUrl
            return { ...prev, aadhaar_photos: newPreviews }
        })
    }

    const removeAadhaarPhoto = (index) => {
        if (cotPreviews.aadhaar_photos[index]) {
            URL.revokeObjectURL(cotPreviews.aadhaar_photos[index])
        }

        setCotFiles(prev => ({
            ...prev,
            aadhaar_photos: prev.aadhaar_photos.filter((_, i) => i !== index)
        }))

        setCotPreviews(prev => ({
            ...prev,
            aadhaar_photos: prev.aadhaar_photos.filter((_, i) => i !== index)
        }))
    }

    const submit = async (e) => {
        e.preventDefault()
        setMsg('')

        // Validate required fields if status is COMPLETED
        if (form.application_status === 'COMPLETED') {
            const requiredFields = [
                // Customer Details
                { field: 'applicant_name', label: 'Customer Name' },
                { field: 'mobile_number', label: 'Mobile Number' },
                { field: 'email_id', label: 'Email ID' },

                // Solar Plant Details
                { field: 'solar_plant_type', label: 'Solar Plant Type' },
                { field: 'solar_system_type', label: 'Solar System Type' },
                { field: 'plant_size_kw', label: 'Plant Size (kW)' },
                { field: 'plant_price', label: 'Plant Price' },

                // Location Details
                { field: 'district', label: 'District' },
                { field: 'installation_pincode', label: 'Pincode' },
                { field: 'site_address', label: 'Site Address' },

                // Meter Details
                { field: 'meter_type', label: 'Meter Type' },

                // Payment Details
                { field: 'payment_mode', label: 'Payment Mode' },
                { field: 'advance_payment_mode', label: 'Advance Payment Mode' },
                { field: 'margin_money', label: 'Margin Money' },

                // Plant Structure
                { field: 'building_floor_number', label: 'Building Floor Number' },
                { field: 'structure_type', label: 'Structure Type' },
                { field: 'free_shadow_area', label: 'Free Shadow Area' },

                // Feasibility
                { field: 'installation_date_feasible', label: 'Installation Date Feasible' },
            ]

            const missingFields = requiredFields.filter(({ field }) => !form[field] || String(form[field]).trim() === '')

            if (missingFields.length > 0) {
                setMsg(`Please fill all required fields before marking as completed: ${missingFields.map(f => f.label).join(', ')}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }

            // Additional validation for custom structure type
            if (form.structure_type === 'Custom' && (!form.structure_length || !form.structure_height)) {
                setMsg('Please provide both length and height for custom structure type')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }

            // Validate required documents
            // Check both newly uploaded files AND existing previews (for edit mode)
            const requiredDocs = ['aadhaar_front', 'aadhaar_back', 'pan_card', 'electric_bill']
            const missingDocs = requiredDocs.filter(doc => !files[doc] && !previews[doc])

            if (missingDocs.length > 0) {
                setMsg(`Please upload all required documents: ${missingDocs.map(d => d.replace(/_/g, ' ').toUpperCase()).join(', ')}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        const blurryImages = Object.entries(blurStatus)
            .filter(([name, isBlurry]) => isBlurry && files[name])
            .map(([name]) => name)

        if (blurryImages.length > 0) {
            setMsg(`Please retake blurry images: ${blurryImages.join(', ').replace(/_/g, ' ')}`)
            return
        }

        setLoading(true)

        try {
            const fd = new FormData()
            fd.append('sales_executive_id', session.employeeId)
            fd.append('sales_executive_name', session.name)

            Object.entries(form).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') {
                    fd.append(k, typeof v === 'boolean' ? String(v) : String(v))
                }
            })

            Object.entries(files).forEach(([k, file]) => {
                if (file) fd.append(k, file)
            })

            const endpoint = isEditMode
                ? `${API_BASE}/applications/${applicationId}`
                : `${API_BASE}/applications`

            const res = await fetch(endpoint, {
                method: isEditMode ? 'PUT' : 'POST',
                body: fd,
            })
            const json = await res.json()

            if (!res.ok) {
                setMsg(json.error || 'Failed to save application.')
            } else {
                setMsg(isEditMode ? 'Application updated successfully!' : 'Application created successfully!')
                Object.values(previews).forEach((url) => url && URL.revokeObjectURL(url))
                setTimeout(() => navigate('/dashboard'), 1200)
            }
        } catch (err) {
            setMsg('Network error.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const CameraCapture = ({ name, label }) => (
        <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
            {!previews[name] ? (
                <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => onFile(name, e.target.files?.[0] || null)}
                        className="hidden"
                        id={`file-${name}`}
                    />
                    <label
                        htmlFor={`file-${name}`}
                        className="flex flex-col items-center justify-center w-full h-24 md:h-28 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                        <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs md:text-sm text-blue-600 font-medium">📷 Capture Photo</span>
                    </label>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="relative">
                        <img
                            src={previews[name]}
                            alt={label}
                            className={`w-full h-32 md:h-40 object-cover rounded-lg border-4 ${blurStatus[name] ? 'border-red-500' : 'border-green-500'
                                }`}
                        />
                        {blurStatus[name] && (
                            <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 text-center rounded-t-lg">
                                ⚠️ BLURRY - RETAKE REQUIRED
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => retakePhoto(name)}
                        className={`w-full py-2 md:py-2.5 rounded-lg font-medium text-sm text-white ${blurStatus[name]
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-slate-600 hover:bg-slate-700'
                            }`}
                    >
                        {blurStatus[name] ? '📷 Retake (Required)' : '📷 Retake'}
                    </button>
                </div>
            )}
        </div>
    )

    if (isEditMode && prefillLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="bg-white shadow-md rounded-lg p-6 text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-slate-700 font-medium">Loading application...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-slate-900 text-white p-4 md:p-6 sticky top-0 z-50 shadow-lg">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold">{isEditMode ? 'Complete Application' : 'New Application'}</h1>
                        <p className="text-xs md:text-sm text-slate-400">Solar CRM System</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                        ← Back
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-8">
                <form onSubmit={submit} className="space-y-5 md:space-y-6">

                    {/* Sales Executive Info */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                            Sales Executive
                        </h3>
                        <input
                            value={session.name}
                            disabled
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-600 text-sm"
                        />
                    </section>

                    {/* Applicant Details */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                            Customer Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                                <input
                                    name="applicant_name"
                                    value={form.applicant_name}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter customer's full name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number *</label>
                                <input
                                    name="mobile_number"
                                    value={form.mobile_number}
                                    onChange={onChange}
                                    type="tel"
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="10-digit mobile number"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email ID</label>
                                <input
                                    type="email"
                                    name="email_id"
                                    value={form.email_id}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="customer@gmail.com (optional)"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Location Details */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                            Location Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">District *</label>
                                <select
                                    name="district"
                                    value={form.district}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select District</option>
                                    {UP_DISTRICTS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Installation Pin Code *</label>
                                <input
                                    name="installation_pincode"
                                    value={form.installation_pincode}
                                    onChange={onChange}
                                    type="tel"
                                    maxLength={6}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="6-digit pincode"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Address *</label>
                                <textarea
                                    name="site_address"
                                    value={form.site_address}
                                    onChange={onChange}
                                    rows={2}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter complete site address for installation"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Location (GPS) - Optional</label>
                                <button
                                    type="button"
                                    onClick={getCurrentLocation}
                                    disabled={locationLoading}
                                    className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {locationLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Getting Location...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Get GPS Coordinates (Optional)
                                        </>
                                    )}
                                </button>
                            </div>
                            {form.site_latitude && form.site_longitude && (
                                <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-xs text-green-800 font-semibold mb-2">📍 GPS Coordinates Captured:</p>
                                    <p className="text-xs text-green-600">
                                        Latitude: {form.site_latitude}, Longitude: {form.site_longitude}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Documents */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">4</span>
                            Documents
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <CameraCapture name="aadhaar_front" label="Aadhaar Card - Front Side" />
                            <CameraCapture name="aadhaar_back" label="Aadhaar Card - Back Side" />
                            <CameraCapture name="pan_card" label="PAN Card" />
                            <CameraCapture name="electric_bill" label="Electricity Bill" />
                            <CameraCapture name="cancel_cheque" label="Cancel Cheque / Passbook" />
                            <CameraCapture name="bank_details_doc" label="Bank Details Document" />
                        </div>
                    </section>

                    {/* Solar Plant Details */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">5</span>
                            Solar Plant Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type of Plant *</label>
                                <select
                                    name="solar_system_type"
                                    value={form.solar_system_type}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="TATA On-Grid">TATA On-Grid</option>
                                    <option value="Customise On-Grid">Customise On-Grid</option>
                                    <option value="TATA Hybrid">TATA Hybrid</option>
                                    <option value="Customise Hybrid">Customise Hybrid</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Plant Category *</label>
                                <select
                                    name="plant_category"
                                    value={form.plant_category}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="Residential">Residential</option>
                                    <option value="Commercial">Commercial</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Plant Size (kW) *</label>
                                <select
                                    name="plant_size_kw"
                                    value={form.plant_size_kw}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select Size</option>
                                    {form.plant_category === 'Residential' ? (
                                        <>
                                            <option value="1">1 kW</option>
                                            <option value="2">2 kW</option>
                                            <option value="3">3 kW</option>
                                            <option value="4">4 kW</option>
                                            <option value="5">5 kW (I)</option>
                                            <option value="5.5">5 kW (III)</option>
                                            <option value="6">6 kW</option>
                                            <option value="8">8 kW</option>
                                            <option value="10">10 kW</option>
                                            <option value="12">12 kW</option>
                                            <option value="15">15 kW</option>
                                            <option value="18">18 kW</option>
                                            <option value="20">20 kW</option>
                                        </>
                                    ) : (
                                        Array.from({ length: 199 }, (_, i) => i + 2).map((kw) => (
                                            <option key={kw} value={kw}>{kw} kW</option>
                                        ))
                                    )}
                                </select>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    {form.plant_category === 'Residential' ? 'Range: 1-20 kW' : 'Range: 2-200 kW'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Plant Price (₹) *</label>
                                <input
                                    type="number"
                                    name="plant_price"
                                    value={form.plant_price}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter total price"
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* Meter Details */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">6</span>
                            Meter Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Meter Type *</label>
                                <select
                                    name="meter_type"
                                    value={form.meter_type}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="Electric Meter">Electric Meter</option>
                                    <option value="Smart Meter">Smart Meter</option>
                                </select>
                            </div>
                            {form.meter_type === 'Smart Meter' && (
                                <div className="md:col-span-2">
                                    <div className="border-t border-slate-200 pt-4 mt-2">
                                        <CameraCapture name="smart_meter_doc" label="Smart Meter Photo *" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Special Requests */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">7</span>
                            Special Requests
                        </h3>
                        <div className="space-y-5">

                            {/* 1. Name Correction */}
                            <div className="border border-slate-200 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">1. Name Correction</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, name_correction_required: 'Not Required', correct_name: '' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.name_correction_required === 'Not Required'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Not Required
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, name_correction_required: 'Required' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.name_correction_required === 'Required'
                                            ? 'bg-orange-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Required
                                    </button>
                                </div>
                                {form.name_correction_required === 'Required' && (
                                    <div className="mt-3">
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">What is the correct name? *</label>
                                        <input
                                            name="correct_name"
                                            value={form.correct_name}
                                            onChange={onChange}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                            placeholder="Enter the correct name for this customer"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 2. Load Enhancement */}
                            <div className="border border-slate-200 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">2. Load Enhancement</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, load_enhancement_required: 'Not Required', current_load: '', required_load: '' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.load_enhancement_required === 'Not Required'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Not Required
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, load_enhancement_required: 'Required' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.load_enhancement_required === 'Required'
                                            ? 'bg-orange-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Required
                                    </button>
                                </div>
                                {form.load_enhancement_required === 'Required' && (
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Old Sanction Load (kW) *</label>
                                            <input
                                                name="current_load"
                                                value={form.current_load}
                                                onChange={onChange}
                                                type="number"
                                                step="0.1"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                                placeholder="e.g., 2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">New Load Required (kW) *</label>
                                            <input
                                                name="required_load"
                                                value={form.required_load}
                                                onChange={onChange}
                                                type="number"
                                                step="0.1"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                                placeholder="e.g., 5"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 3. COT */}
                            <div className="border border-slate-200 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">3. COT (Connection Transfer)</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, cot_required: 'No', cot_type: '', cot_documents: '' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.cot_required === 'No'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Not Required
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, cot_required: 'Yes' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.cot_required === 'Yes'
                                            ? 'bg-orange-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Required
                                    </button>
                                </div>
                                {form.cot_required === 'Yes' && (
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">COT Type *</label>
                                            <select
                                                name="cot_type"
                                                value={form.cot_type}
                                                onChange={onChange}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-500"
                                                required
                                            >
                                                <option value="">Select Type</option>
                                                <option value="Live to Live">Live to Live</option>
                                                <option value="Death to Live">Death to Live</option>
                                            </select>
                                        </div>

                                        {/* Live to Live Document Uploads */}
                                        {form.cot_type === 'Live to Live' && (
                                            <div className="space-y-4 mt-4">
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                                    <p className="text-xs font-semibold text-amber-800 mb-1">📋 Required Documents:</p>
                                                    <p className="text-xs text-amber-700">Aadhaar card of both persons required</p>
                                                </div>

                                                {/* First Person Aadhaar */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">First Person Aadhaar Card *</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => onCotFile('live_to_live_aadhaar_1', e.target.files?.[0])}
                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    {cotPreviews.live_to_live_aadhaar_1 && (
                                                        <img src={cotPreviews.live_to_live_aadhaar_1} alt="First Person Aadhaar" className="mt-2 w-32 h-32 object-cover rounded border" />
                                                    )}
                                                </div>

                                                {/* Second Person Aadhaar */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">Second Person Aadhaar Card *</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => onCotFile('live_to_live_aadhaar_2', e.target.files?.[0])}
                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    {cotPreviews.live_to_live_aadhaar_2 && (
                                                        <img src={cotPreviews.live_to_live_aadhaar_2} alt="Second Person Aadhaar" className="mt-2 w-32 h-32 object-cover rounded border" />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Death to Live Document Uploads */}
                                        {form.cot_type === 'Death to Live' && (
                                            <div className="space-y-4 mt-4">
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                                    <p className="text-xs font-semibold text-amber-800 mb-1">📋 Required Documents:</p>
                                                    <p className="text-xs text-amber-700">
                                                        Death certificate + Up to 6 persons Aadhaar + Family register + House papers + Passport photo
                                                    </p>
                                                </div>
                                                {/* Death Certificate */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">Death Certificate *</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => onCotFile('death_certificate', e.target.files?.[0])}
                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    {cotPreviews.death_certificate && (
                                                        <img src={cotPreviews.death_certificate} alt="Death Certificate" className="mt-2 w-32 h-32 object-cover rounded border" />
                                                    )}
                                                </div>

                                                {/* House Papers */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">House Papers *</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => onCotFile('house_papers', e.target.files?.[0])}
                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    {cotPreviews.house_papers && (
                                                        <img src={cotPreviews.house_papers} alt="House Papers" className="mt-2 w-32 h-32 object-cover rounded border" />
                                                    )}
                                                </div>

                                                {/* Passport Size Photo */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">Passport Size Photo *</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => onCotFile('passport_photo', e.target.files?.[0])}
                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    {cotPreviews.passport_photo && (
                                                        <img src={cotPreviews.passport_photo} alt="Passport Photo" className="mt-2 w-32 h-32 object-cover rounded border" />
                                                    )}
                                                </div>

                                                {/* Family Registration Papers */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">Family Registration Papers *</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => onCotFile('family_registration', e.target.files?.[0])}
                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    {cotPreviews.family_registration && (
                                                        <img src={cotPreviews.family_registration} alt="Family Registration" className="mt-2 w-32 h-32 object-cover rounded border" />
                                                    )}
                                                </div>

                                                {/* Aadhaar Photos (up to 6) */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-2">Aadhaar Photos (Up to 6 persons)</label>
                                                    <div className="space-y-3">
                                                        {cotFiles.aadhaar_photos.map((_, index) => (
                                                            <div key={index} className="flex gap-2 items-start">
                                                                <div className="flex-1">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => onAadhaarPhoto(index, e.target.files?.[0])}
                                                                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                                    />
                                                                    {cotPreviews.aadhaar_photos[index] && (
                                                                        <img src={cotPreviews.aadhaar_photos[index]} alt={`Aadhaar ${index + 1}`} className="mt-2 w-24 h-24 object-cover rounded border" />
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeAadhaarPhoto(index)}
                                                                    className="mt-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {cotFiles.aadhaar_photos.length < 6 && (
                                                            <button
                                                                type="button"
                                                                onClick={addAadhaarPhoto}
                                                                className="w-full py-2 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <span className="text-xl">+</span>
                                                                <span className="text-sm font-medium">Add Aadhaar Photo ({cotFiles.aadhaar_photos.length}/6)</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Additional Notes</label>
                                            <textarea
                                                name="cot_documents"
                                                value={form.cot_documents}
                                                onChange={onChange}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                                rows={2}
                                                placeholder="Add any notes about COT documents..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. Finance Required */}
                            <div className="border border-slate-200 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">4. Finance Required</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, special_finance_required: 'No' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.special_finance_required === 'No'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        No
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, special_finance_required: 'Yes' }))}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.special_finance_required === 'Yes'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                            }`}
                                    >
                                        Yes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Payment Details */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">8</span>
                            Payment Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode of Payment *</label>
                                <select
                                    name="payment_mode"
                                    value={form.payment_mode}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Subsidy">Subsidy</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Advance Payment Mode *</label>
                                <select
                                    name="advance_payment_mode"
                                    value={form.advance_payment_mode}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="UPI">UPI</option>
                                </select>
                            </div>
                            {form.advance_payment_mode === 'UPI' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">UPI Account *</label>
                                        <select
                                            name="upi_type"
                                            value={form.upi_type}
                                            onChange={onChange}
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="Company">Company UPI</option>
                                            <option value="Prashant">Prashant</option>
                                            <option value="SN Singh">SN Singh</option>
                                        </select>
                                    </div>
                                    {form.upi_type && (
                                        <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm font-semibold text-blue-800 mb-3">📱 UPI QR Code for {form.upi_type}</p>
                                            <div className="flex justify-center">
                                                <div className="bg-white p-4 rounded-lg shadow-md">
                                                    <svg className="w-48 h-48 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                    </svg>
                                                    <p className="text-center text-xs text-slate-500 mt-2">Scan to Pay</p>
                                                    <p className="text-center text-xs font-semibold text-slate-700">{form.upi_type}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Margin Money (₹)</label>
                                <input
                                    type="number"
                                    name="margin_money"
                                    value={form.margin_money}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter advance amount"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Plant Structure */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">9</span>
                            Plant Structure
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Building Height/Floor</label>
                                <input
                                    type="number"
                                    name="building_floor_number"
                                    value={form.building_floor_number}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0 for Ground, 1, 2, 3..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Structure Type</label>
                                <select
                                    name="structure_type"
                                    value={form.structure_type}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Type</option>
                                    <option value="3*5">3 × 5</option>
                                    <option value="5*7">5 × 7</option>
                                    <option value="Custom">Custom (Length × Height)</option>
                                </select>
                            </div>
                            {form.structure_type === 'Custom' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Length (ft)</label>
                                        <input
                                            type="number"
                                            name="structure_length"
                                            value={form.structure_length}
                                            onChange={onChange}
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter length"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Height (ft)</label>
                                        <input
                                            type="number"
                                            name="structure_height"
                                            value={form.structure_height}
                                            onChange={onChange}
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter height"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Free Shadow Area (sq. ft.)</label>
                                <input
                                    type="number"
                                    name="free_shadow_area"
                                    value={form.free_shadow_area}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter free shadow area in square feet"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Installation Date */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">10</span>
                            Expected Installation Date
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected Installation Date</label>
                            <input
                                type="date"
                                name="installation_date_feasible"
                                value={form.installation_date_feasible}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </section>

                    {/* Application Status */}
                    <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                            <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">11</span>
                            Application Status
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4 items-center">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                                <select
                                    name="application_status"
                                    value={form.application_status}
                                    onChange={onChange}
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                            <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <p className="font-semibold text-slate-800 mb-1">When to use:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><span className="font-semibold">Draft</span> - Save now and finish later.</li>
                                    <li><span className="font-semibold">Completed</span> - Form is fully filled.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Message */}
                    {msg && (
                        <div className={`p-4 rounded-xl text-center font-medium border ${msg.includes('success')
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                            }`}>
                            {msg}
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="grid md:grid-cols-2 gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-2 md:order-1"
                        >
                            {loading
                                ? (isEditMode ? '⏳ Saving...' : '⏳ Creating...')
                                : (isEditMode ? '✓ Save Application' : '✓ Create Application')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-3.5 rounded-xl bg-slate-200 text-slate-700 font-medium text-base hover:bg-slate-300 transition-colors order-1 md:order-2"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}
