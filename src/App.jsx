import { useEffect, useState, useMemo } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  FileCheck,
  User,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  DollarSign,
  ChevronRight,
  Pill
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const STAGES = [
  { id: 'placed', label: 'Order Confirmed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', step: 1 },
  { id: 'verified', label: 'Pharmacist Verified', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', step: 2 },
  { id: 'dispatched', label: 'Packed & Dispatched', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', step: 3 },
  { id: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', step: 4 },
  { id: 'delivered', label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30', step: 5 },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', step: 0 },
]

export default function App() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastCount, setLastCount] = useState(0)
  const [expandedImage, setExpandedImage] = useState(null)

  // Real-time Live Listener on Firebase Firestore "orders" collection
  useEffect(() => {
    try {
      const q = collection(db, 'orders')
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate().toISOString() : (d.data().createdAt || new Date().toISOString())
          }))

          // Sort latest orders first
          list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

          if (!loading && list.length > lastCount && lastCount > 0) {
            toast.success('🔔 New Customer Order Received Live!', {
              style: { background: '#1e293b', color: '#10b981', border: '1px solid #10b981' },
              duration: 5000,
            })
            if (soundEnabled) {
              try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)()
                const osc = ctx.createOscillator()
                osc.type = 'sine'
                osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
                osc.connect(ctx.destination)
                osc.start()
                osc.stop(ctx.currentTime + 0.25)
              } catch (e) {}
            }
          }

          setOrders(list)
          setLastCount(list.length)
          setLoading(false)
        },
        (error) => {
          console.error('Firestore live listener error:', error)
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Snapshot initialization error:', err)
      setLoading(false)
    }
  }, [lastCount, loading, soundEnabled])

  // Update Status in Firestore Live
  async function handleUpdateStatus(orderId, newStatus, stepNumber) {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        statusStep: stepNumber,
        updatedAt: serverTimestamp(),
      })
      toast.success(`Order #${orderId.slice(0, 8).toUpperCase()} updated to ${newStatus.replace(/_/g, ' ')}! ✨`)
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus, statusStep: stepNumber }))
      }
    } catch (err) {
      console.error('Update status error:', err)
      toast.error('Failed to update status in cloud: ' + (err?.message || 'Check connection'))
    }
  }

  // Quick Demo Generator for testing & evaluation
  async function handleCreateDemoOrder() {
    try {
      const demoId = 'MED-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      const sampleMedicines = [
        { name: 'Clariterm 250mg Tablets', unitPrice: 145, quantity: 1, subtotal: 145 },
        { name: 'Sinarest New Anti-Cold Tablets', unitPrice: 68.5, quantity: 2, subtotal: 137 },
      ]
      const total = 282

      await addDoc(collection(db, 'orders'), {
        userId: 'demo_user_' + Math.floor(Math.random() * 900),
        userEmail: 'patient@example.com',
        deliveryName: 'Rahul Verma',
        deliveryPhone: '9845012345',
        deliveryAddress: 'Flat 402, Sunshine Heights, Amaravati - 522001',
        paymentMethod: 'COD',
        totalAmount: total,
        total: total,
        status: 'placed',
        statusStep: 1,
        items: sampleMedicines,
        estimatedDelivery: 'Today within 2–4 hours',
        courierPartner: 'MediCare Express Logistics',
        trackingNumber: 'TRK-' + Math.floor(10000000 + Math.random() * 90000000),
        createdAt: serverTimestamp(),
      })

      toast.success('⚡ Live test customer order generated!')
    } catch (err) {
      console.error('Demo order error:', err)
      toast.error('Error generating demo: ' + err.message)
    }
  }

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch =
        (o.deliveryName || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.deliveryPhone || '').includes(search) ||
        (o.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.deliveryAddress || '').toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? (o.status !== 'delivered' && o.status !== 'cancelled') :
        o.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalRev = orders.reduce((sum, o) => sum + (Number(o.totalAmount || o.total || 0)), 0)
    const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
    const delivered = orders.filter(o => o.status === 'delivered').length
    const rxCount = orders.filter(o => Boolean(o.prescription)).length

    return {
      totalOrders: orders.length,
      revenue: totalRev,
      active,
      delivered,
      rxCount,
    }
  }, [orders])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Toaster position="top-right" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                MediCare <span className="text-emerald-400">Admin</span>
              </h1>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-Time Pharmacy Order Dispatch & Management Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Sound Alerts' : 'Enable Sound Alerts'}
            className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleCreateDemoOrder}
            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4" /> Simulate Customer Order
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Analytics Highlights */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Total Orders</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><ShoppingBag className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-black text-white">{metrics.totalOrders}</p>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" /> Live synchronized
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Gross Revenue (COD)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><DollarSign className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-black text-emerald-400">₹{metrics.revenue.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 mt-1">All verified checkouts</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Active In-Transit</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Truck className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-black text-amber-400">{metrics.active}</p>
            <p className="text-[11px] text-slate-400 mt-1">Needs delivery dispatch</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Delivered Orders</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <p className="text-3xl font-black text-purple-400">{metrics.delivered}</p>
            <p className="text-[11px] text-slate-400 mt-1">100% completed parcels</p>
          </div>
        </section>

        {/* Filters & Search Control Bar */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'active', label: 'In-Transit' },
              { id: 'placed', label: 'New / Placed' },
              { id: 'verified', label: 'Pharmacist Checked' },
              { id: 'dispatched', label: 'Dispatched' },
              { id: 'delivered', label: 'Delivered' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, phone, ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
            />
          </div>
        </section>

        {/* Live Orders Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Orders Feed ({filteredOrders.length})
            </h2>
            <span className="text-xs text-slate-500">Auto-refreshing via Cloud Firestore Webhooks</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Orders Matching Filter</h3>
              <p className="text-xs text-slate-400 mb-6">
                Waiting for incoming checkouts from <code className="text-blue-400">medicare-one-sand.vercel.app</code>
              </p>
              <button
                onClick={handleCreateDemoOrder}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                <Sparkles className="w-4 h-4" /> Place Demo Customer Order
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => {
                const stage = STAGES.find(s => s.id === order.status) || STAGES[0]

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 transition-all hover:shadow-xl hover:shadow-slate-950/40"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Customer & ID */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                            #{order.id.slice(0, 10).toUpperCase()}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stage.color}`}>
                            {stage.label}
                          </span>
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            💵 Cash on Delivery
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            {order.deliveryName || 'Customer'}
                            <span className="text-xs text-slate-500 font-normal">({order.userEmail || 'No email'})</span>
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {order.deliveryPhone || 'N/A'}</span>
                            <span className="flex items-center gap-1.5 line-clamp-1"><MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> {order.deliveryAddress || 'No address'}</span>
                          </div>
                        </div>

                        {order.prescription && (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              <FileCheck className="w-3.5 h-3.5" /> Doctor's Rx: <strong>{order.prescription}</strong>
                            </div>
                            {order.prescriptionImage && (
                              <button
                                onClick={() => setExpandedImage(order.prescriptionImage)}
                                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors"
                              >
                                <img src={order.prescriptionImage} alt="Rx" className="w-4 h-4 rounded object-cover" />
                                <span>View Photo 🔍</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Middle: Items & Total */}
                      <div className="lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                        <p className="text-2xl font-black text-emerald-400">
                          ₹{Number(order.totalAmount || order.total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} in parcel
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center lg:justify-end gap-1">
                          <Clock className="w-3 h-3" /> Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Right: Quick Stage Advancement Controls */}
                      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                        >
                          View Items
                        </button>

                        {order.status === 'placed' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'verified', 2)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verify Rx
                          </button>
                        )}

                        {order.status === 'verified' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'dispatched', 3)}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5"
                          >
                            <Package className="w-3.5 h-3.5" /> Pack & Dispatch
                          </button>
                        )}

                        {order.status === 'dispatched' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'out_for_delivery', 4)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" /> Out for Delivery
                          </button>
                        )}

                        {order.status === 'out_for_delivery' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'delivered', 5)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-green-600/20 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                          </button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </main>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-base font-bold text-white">Order Details</h3>
                <p className="font-mono text-xs text-blue-400">#{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Delivery Details */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <p><strong>Customer Name:</strong> {selectedOrder.deliveryName}</p>
                <p><strong>Phone:</strong> {selectedOrder.deliveryPhone}</p>
                <p><strong>Email:</strong> {selectedOrder.userEmail}</p>
                <p><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                {selectedOrder.notes && <p><strong>Delivery Notes:</strong> {selectedOrder.notes}</p>}
                {selectedOrder.prescription && (
                  <p className="text-indigo-400"><strong>Doctor's Prescription:</strong> {selectedOrder.prescription}</p>
                )}
                {selectedOrder.prescriptionImage && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="font-bold text-white mb-2 flex items-center gap-1.5 text-xs text-indigo-400">
                      <FileCheck className="w-4 h-4" /> Uploaded Prescription / Medicine List Photo:
                    </p>
                    <div 
                      onClick={() => setExpandedImage(selectedOrder.prescriptionImage)}
                      className="cursor-pointer group relative rounded-2xl overflow-hidden border border-slate-700 bg-black max-h-52 flex items-center justify-center hover:border-indigo-500 transition-colors"
                    >
                      <img 
                        src={selectedOrder.prescriptionImage} 
                        alt="Prescription document" 
                        className="max-h-52 w-full object-contain group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-opacity">
                        🔍 Click to Zoom In Full Screen
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-bold text-white text-sm mb-3">Ordered Medicines</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="text-[11px] text-slate-500">Qty: {item.quantity} × ₹{item.unitPrice}</p>
                      </div>
                      <span className="font-bold text-emerald-400">₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change Status Dropdown / Controls */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <p className="font-bold text-white mb-2">Change Delivery Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.filter(s => s.id !== 'cancelled').map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleUpdateStatus(selectedOrder.id, s.id, s.step)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                        selectedOrder.status === s.id
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Full-Screen Prescription Viewer Modal */}
      {expandedImage && (
        <div 
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center mb-3">
              <span className="text-white font-bold text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" /> High-Resolution Prescription / Medicine List
              </span>
              <button 
                onClick={() => setExpandedImage(null)}
                className="text-white hover:text-red-400 font-bold text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
              >
                <X className="w-4 h-4" /> Close Preview
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] w-full rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img 
                src={expandedImage} 
                alt="Expanded Prescription" 
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        MediCare Plus Administration Portal • Real-time WebSockets & Firestore Synchronizer • Built for VTAPP 2026
      </footer>
    </div>
  )
}
