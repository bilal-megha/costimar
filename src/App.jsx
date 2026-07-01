import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import LoginModal    from './modals/LoginModal.jsx'
import RegisterModal from './modals/RegisterModal.jsx'
import CheckoutModal from './modals/CheckoutModal.jsx'
import CartModal     from './modals/CartModal.jsx'
import AccountModal  from './modals/AccountModal.jsx'
import NotificationBell from './components/NotificationBell.jsx'

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
const sevenAgo   = new Date(Date.now() - SEVEN_DAYS)

function calcPromoDiscount(product, promos) {
  if (!promos?.length) return 0
  let best = 0
  const now = new Date()
  for (const pr of promos) {
    if (!pr.active) continue
    if (pr.end_date && new Date(pr.end_date) < now) continue
    const pids = typeof pr.product_ids === 'string'
      ? JSON.parse(pr.product_ids || '[]') : (pr.product_ids || [])
    if (pids.length > 0 && !pids.map(String).includes(String(product.id))) continue
    let disc = 0
    if (pr.type === 'percent') disc = (product.price * (pr.discount_value || 0)) / 100
    else if (pr.type === 'fixed') disc = pr.discount_value || 0
    if (disc > best) best = disc
  }
  return Math.min(best, product.price)
}

// ══════════════════════════════════════════
// PRODUCT CARD
// ══════════════════════════════════════════
function ProductCard({ p, wishlist, promos, CUR, sevenAgo, addToCart, toggleWish, onDetail }) {
  const disc   = calcPromoDiscount(p, promos)
  const final  = Math.max(0, p.price - disc)
  const isNew  = new Date(p.created_at) >= sevenAgo
  const isW    = wishlist.map(String).includes(String(p.id))

  return (
    <div onClick={() => onDetail(p)}
      style={{ background:'white', borderRadius:16, overflow:'hidden',
        boxShadow:'0 2px 12px rgba(0,0,0,.07)', cursor:'pointer',
        transition:'.2s', border:'1px solid #F1F5F9', position:'relative' }}
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform='none'}>

      {/* صورة */}
      <div style={{ position:'relative', paddingTop:'75%', background:'#F8FAFC' }}>
        {p.image
          ? <img src={p.image} alt={p.name}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }} />
          : <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',
              justifyContent:'center',fontSize:40 }}>📦</div>
        }
        {/* badges */}
        <div style={{ position:'absolute',top:8,right:8,display:'flex',flexDirection:'column',gap:4 }}>
          {isNew && <span style={{ background:'#10B981',color:'white',fontSize:10,fontWeight:800,
            padding:'2px 8px',borderRadius:20 }}>جديد</span>}
          {disc > 0 && <span style={{ background:'#EF4444',color:'white',fontSize:10,fontWeight:800,
            padding:'2px 8px',borderRadius:20 }}>-{Math.round(disc/p.price*100)}%</span>}
        </div>
        {/* زر المفضلة */}
        <button onClick={e => { e.stopPropagation(); toggleWish(p.id) }}
          style={{ position:'absolute',top:8,left:8,background:'white',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,.15)' }}>
          {isW ? '❤️' : '🤍'}
        </button>
      </div>

      {/* معلومات */}
      <div style={{ padding:'12px' }}>
        <div style={{ fontSize:13,fontWeight:700,color:'#1E293B',marginBottom:6,
          overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>
          {p.name}
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div>
            {disc > 0 && <div style={{ fontSize:11,color:'#94A3B8',textDecoration:'line-through' }}>
              {p.price} {CUR}
            </div>}
            <div style={{ fontSize:15,fontWeight:900,color:'#F97316' }}>
              {final.toFixed(0)} {CUR}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); addToCart(p) }}
            style={{ background:'#F97316',color:'white',border:'none',borderRadius:10,
              padding:'7px 12px',fontWeight:800,fontSize:12,cursor:'pointer',
              fontFamily:'inherit',transition:'.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='#EA6C0A'}
            onMouseLeave={e => e.currentTarget.style.background='#F97316'}>
            + سلة
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// DETAIL MODAL
// ══════════════════════════════════════════
function DetailModal({ product, wishlist, promos, CUR, onClose, addToCart, toggleWish }) {
  if (!product) return null
  const disc  = calcPromoDiscount(product, promos)
  const final = Math.max(0, product.price - disc)
  const isW   = wishlist.map(String).includes(String(product.id))

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',width:'100%',
        maxWidth:480,maxHeight:'90vh',overflowY:'auto',padding:24 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',margin:0 }}>{product.name}</h2>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18 }}>✕</button>
        </div>
        {product.image && (
          <img src={product.image} alt={product.name}
            style={{ width:'100%',height:220,objectFit:'cover',borderRadius:16,marginBottom:16 }} />
        )}
        {product.description && (
          <p style={{ fontSize:13,color:'#64748B',marginBottom:16,lineHeight:1.7 }}>{product.description}</p>
        )}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <div>
            {disc>0 && <div style={{ fontSize:12,color:'#94A3B8',textDecoration:'line-through' }}>{product.price} {CUR}</div>}
            <div style={{ fontSize:24,fontWeight:900,color:'#F97316' }}>{final.toFixed(0)} {CUR}</div>
          </div>
          <button onClick={() => toggleWish(product.id)}
            style={{ background:'#FFF1F2',border:'none',borderRadius:12,
              padding:'8px 16px',fontSize:18,cursor:'pointer' }}>
            {isW ? '❤️' : '🤍'}
          </button>
        </div>
        <button onClick={() => { addToCart(product); onClose() }}
          style={{ width:'100%',padding:'14px',background:'#F97316',color:'white',
            border:'none',borderRadius:14,fontSize:15,fontWeight:900,cursor:'pointer',
            fontFamily:'inherit' }}>
          🛒 أضف للسلة
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════
function HomeTab({ allP, newP, bestSellers, banners, bannerIdx, setBannerIdx,
  promos, brands, categories, brandSel, setBrandSel, catSel, setCatSel,
  setTab, CUR, wishlist, addToCart, toggleWish, onDetail, settings }) {

  const cardProps = { wishlist, promos, CUR, sevenAgo, addToCart, toggleWish, onDetail }
  const announce  = settings?.find?.(s=>s.key==='announce')?.value || ''

  return (
    <div>
      {/* إعلان */}
      {announce && (
        <div style={{ background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,
          padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:700,color:'#92400E',
          textAlign:'center' }}>
          📢 {announce}
        </div>
      )}

      {/* بانر */}
      {banners.length > 0 && (
        <div style={{ borderRadius:16,overflow:'hidden',marginBottom:20,position:'relative',
          background:'#F1F5F9',aspectRatio:'16/6' }}>
          <img src={banners[bannerIdx]?.image} alt={banners[bannerIdx]?.title}
            style={{ width:'100%',height:'100%',objectFit:'cover' }} />
          {banners.length > 1 && (
            <div style={{ position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',
              display:'flex',gap:6 }}>
              {banners.map((_,i) => (
                <button key={i} onClick={() => setBannerIdx(i)}
                  style={{ width: bannerIdx===i ? 20 : 8, height:8,borderRadius:20,border:'none',
                    background: bannerIdx===i ? '#F97316' : 'rgba(255,255,255,.7)',
                    cursor:'pointer',transition:'.3s',padding:0 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* العروض */}
      {promos.filter(p=>p.active).length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <span style={{ fontWeight:900,fontSize:16,color:'#1E293B' }}>🎯 العروض الحالية</span>
            <button onClick={() => setTab('search')}
              style={{ background:'none',border:'none',color:'#F97316',fontWeight:700,
                cursor:'pointer',fontSize:13,fontFamily:'inherit' }}>عرض الكل</button>
          </div>
          <div style={{ display:'flex',gap:12,overflowX:'auto',paddingBottom:8 }}>
            {promos.filter(p=>p.active).map(pr => (
              <div key={pr.id} style={{ minWidth:200,background:'linear-gradient(135deg,#F97316,#EA580C)',
                borderRadius:14,padding:16,color:'white',flexShrink:0 }}>
                <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>{pr.name}</div>
                <div style={{ fontSize:12,opacity:.9 }}>{pr.description||''}</div>
                {pr.discount_value>0 && (
                  <div style={{ fontSize:22,fontWeight:900,marginTop:8 }}>
                    -{pr.discount_value}{pr.type==='percent'?'%':' '+CUR}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* أفضل الماركات */}
      {brands.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:900,fontSize:16,color:'#1E293B',marginBottom:12 }}>🏷️ أفضل الماركات</div>
          <div style={{ display:'flex',gap:10,overflowX:'auto',paddingBottom:8 }}>
            <button onClick={() => setBrandSel(null)}
              style={{ flexShrink:0,padding:'8px 16px',borderRadius:20,border:'2px solid',
                fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                background: brandSel===null ? '#F97316' : 'white',
                borderColor: brandSel===null ? '#F97316' : '#E2E8F0',
                color: brandSel===null ? 'white' : '#64748B' }}>
              الكل
            </button>
            {brands.map(b => (
              <button key={b.id} onClick={() => setBrandSel(b.id)}
                style={{ flexShrink:0,padding:'8px 16px',borderRadius:20,border:'2px solid',
                  fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                  background: brandSel===b.id ? '#F97316' : 'white',
                  borderColor: brandSel===b.id ? '#F97316' : '#E2E8F0',
                  color: brandSel===b.id ? 'white' : '#64748B' }}>
                {b.logo && <img src={b.logo} style={{ width:16,height:16,objectFit:'contain',marginLeft:6 }} />}
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الفئات */}
      {categories.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:900,fontSize:16,color:'#1E293B',marginBottom:12 }}>🗂️ الفئات</div>
          <div style={{ display:'flex',gap:10,overflowX:'auto',paddingBottom:8 }}>
            <button onClick={() => setCatSel(null)}
              style={{ flexShrink:0,padding:'8px 16px',borderRadius:20,border:'2px solid',
                fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                background: catSel===null ? '#2E7D32' : 'white',
                borderColor: catSel===null ? '#2E7D32' : '#E2E8F0',
                color: catSel===null ? 'white' : '#64748B' }}>
              الكل
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setCatSel(c.id)}
                style={{ flexShrink:0,padding:'8px 16px',borderRadius:20,border:'2px solid',
                  fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',
                  background: catSel===c.id ? '#2E7D32' : 'white',
                  borderColor: catSel===c.id ? '#2E7D32' : '#E2E8F0',
                  color: catSel===c.id ? 'white' : '#64748B' }}>
                {c.icon||'📦'} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* المفضلة */}
      {wishlist.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <span style={{ fontWeight:900,fontSize:16,color:'#1E293B' }}>❤️ مفضلتك</span>
            <button onClick={() => setTab('wish')}
              style={{ background:'none',border:'none',color:'#F97316',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:'inherit' }}>
              عرض الكل
            </button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
            {allP.filter(p=>wishlist.map(String).includes(String(p.id))).slice(0,4).map(p => (
              <ProductCard key={p.id} p={p} {...cardProps} />
            ))}
          </div>
        </div>
      )}

      {/* منتجات جديدة */}
      {newP.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:900,fontSize:16,color:'#1E293B',marginBottom:12 }}>✨ منتجات جديدة</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
            {newP.slice(0,6).map(p => <ProductCard key={p.id} p={p} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* الأكثر طلباً */}
      {bestSellers.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontWeight:900,fontSize:16,color:'#1E293B',marginBottom:12 }}>🔥 الأكثر طلباً</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
            {bestSellers.slice(0,6).map(p => <ProductCard key={p.id} p={p} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* كل المنتجات */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:900,fontSize:16,color:'#1E293B',marginBottom:12 }}>📦 كل المنتجات</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
          {allP
            .filter(p => !brandSel || p.brand_id===brandSel)
            .map(p => <ProductCard key={p.id} p={p} {...cardProps} />)}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// SEARCH TAB
// ══════════════════════════════════════════
function SearchTab({ allP, promos, CUR, wishlist, addToCart, toggleWish, onDetail, categories, brands }) {
  const [q,    setQ]    = useState('')
  const [cat,  setCat]  = useState(null)
  const [brand,setBrand]= useState(null)
  const cardProps = { wishlist, promos, CUR, sevenAgo, addToCart, toggleWish, onDetail }

  const results = allP.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase())
    const matchC = !cat   || /* product_categories */ true
    const matchB = !brand || p.brand_id === brand
    return matchQ && matchB
  })

  return (
    <div>
      <input value={q} onChange={e=>setQ(e.target.value)}
        placeholder="🔍 ابحث عن منتج..."
        style={{ width:'100%',padding:'12px 16px',borderRadius:14,
          border:'2px solid #E2E8F0',fontSize:14,fontFamily:'inherit',
          outline:'none',boxSizing:'border-box',marginBottom:16,
          background:'white',direction:'rtl' }} />
      <div style={{ display:'flex',gap:8,overflowX:'auto',marginBottom:16,paddingBottom:4 }}>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCat(cat===c.id?null:c.id)}
            style={{ flexShrink:0,padding:'6px 14px',borderRadius:20,border:'2px solid',
              fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit',
              background: cat===c.id ? '#F97316' : 'white',
              borderColor: cat===c.id ? '#F97316' : '#E2E8F0',
              color: cat===c.id ? 'white' : '#64748B' }}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>
      {results.length === 0
        ? <div style={{ textAlign:'center',padding:40,color:'#64748B' }}>
            <div style={{ fontSize:40 }}>🔍</div>
            <div style={{ marginTop:8,fontWeight:600 }}>لا توجد نتائج</div>
          </div>
        : <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
            {results.map(p => <ProductCard key={p.id} p={p} {...cardProps} />)}
          </div>
      }
    </div>
  )
}

// ══════════════════════════════════════════
// WISH TAB
// ══════════════════════════════════════════
function WishTab({ allP, wishlist, promos, CUR, addToCart, toggleWish, onDetail }) {
  const wishIds  = wishlist.map(String)
  const wishProds = allP.filter(p => wishIds.includes(String(p.id)))
  const cardProps = { wishlist, promos, CUR, sevenAgo, addToCart, toggleWish, onDetail }

  return (
    <div>
      <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',marginBottom:16 }}>❤️ المفضلة</h2>
      {wishProds.length === 0
        ? <div style={{ textAlign:'center',padding:60,color:'#64748B' }}>
            <div style={{ fontSize:48 }}>🤍</div>
            <div style={{ fontWeight:700,marginTop:8 }}>لا توجد منتجات في المفضلة</div>
          </div>
        : <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
            {wishProds.map(p => <ProductCard key={p.id} p={p} {...cardProps} />)}
          </div>
      }
    </div>
  )
}

// ══════════════════════════════════════════
// ORDERS TAB
// ══════════════════════════════════════════
function OrdersTab({ customer, CUR }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer?.id) { setLoading(false); return }
    supabase.from('orders').select('*')
      .eq('customer_id', customer.id)
      .order('id', { ascending: false })
      .then(({ data }) => { setOrders(data||[]); setLoading(false) })
  }, [customer?.id])

  const STATUS = {
    processing: { label:'قيد المعالجة', color:'#F59E0B', bg:'#FEF3C7' },
    confirmed:  { label:'مؤكدة',        color:'#3B82F6', bg:'#DBEAFE' },
    shipped:    { label:'في الطريق',    color:'#8B5CF6', bg:'#EDE9FE' },
    delivered:  { label:'تم التسليم',   color:'#10B981', bg:'#D1FAE5' },
    cancelled:  { label:'ملغاة',        color:'#EF4444', bg:'#FEE2E2' },
  }

  if (!customer) return (
    <div style={{ textAlign:'center',padding:60,color:'#64748B' }}>
      <div style={{ fontSize:48 }}>📦</div>
      <div style={{ fontWeight:700,marginTop:8 }}>سجّل دخولك لرؤية طلبياتك</div>
    </div>
  )

  if (loading) return <div style={{ textAlign:'center',padding:40 }}>⏳ جاري التحميل...</div>

  return (
    <div>
      <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',marginBottom:16 }}>📦 طلبياتي</h2>
      {orders.length === 0
        ? <div style={{ textAlign:'center',padding:60,color:'#64748B' }}>
            <div style={{ fontSize:48 }}>📭</div>
            <div style={{ fontWeight:700,marginTop:8 }}>لا توجد طلبيات بعد</div>
          </div>
        : orders.map(o => {
            const st = STATUS[o.status] || STATUS.processing
            const items = typeof o.items==='string' ? JSON.parse(o.items||'[]') : (o.items||[])
            return (
              <div key={o.id} style={{ background:'white',borderRadius:16,padding:16,
                marginBottom:12,boxShadow:'0 2px 10px rgba(0,0,0,.06)',border:'1px solid #F1F5F9' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                  <div style={{ fontWeight:800,color:'#1E293B' }}>
                    طلبية #{o.invoice_num || o.id}
                  </div>
                  <span style={{ padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,
                    background:st.bg,color:st.color }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize:12,color:'#64748B',marginBottom:8 }}>
                  {items.length} منتج — {new Date(o.created_at).toLocaleDateString('ar-DZ')}
                </div>
                <div style={{ fontWeight:900,color:'#F97316',fontSize:16 }}>
                  {o.total} {CUR}
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

// ══════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════
export default function App() {
  // ── البيانات ──
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [brands,     setBrands]     = useState([])
  const [promos,     setPromos]     = useState([])
  const [banners,    setBanners]    = useState([])
  const [settings,   setSettings]   = useState([])
  const [loading,    setLoading]    = useState(true)

  // ── المستخدم ──
  const [customer, setCustomer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('safaa_customer')) } catch { return null }
  })

  // ── UI ──
  const [tab,        setTab]        = useState('home')
  const [modal,      setModal]      = useState(null)
  const [cart,       setCart]       = useState([])
  const [wishlist,   setWishlist]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('safaa_wish') || '[]') } catch { return [] }
  })
  const [detailProd, setDetailProd] = useState(null)
  const [bannerIdx,  setBannerIdx]  = useState(0)
  const [brandSel,   setBrandSel]   = useState(null)
  const [catSel,     setCatSel]     = useState(null)
  const [thankId,    setThankId]    = useState(null)

  // ── الإعدادات ──
  const getSetting = k => settings.find(s=>s.key===k)?.value || ''
  const CUR       = getSetting('currency') || 'دج'
  const SNAME     = getSetting('store_name') || 'صفاء'
  const primaryColor = getSetting('primary_color') || '#2E7D32'

  // ── تحميل البيانات ──
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [
          { data: prods },
          { data: cats },
          { data: brnds },
          { data: prs },
          { data: bnrs },
          { data: stgs },
        ] = await Promise.all([
          supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false }),
          supabase.from('categories').select('*').order('name'),
          supabase.from('brands').select('*').order('name'),
          supabase.from('promotions').select('*').eq('active', true),
          supabase.from('banners').select('*').eq('active', true).order('sort_order'),
          supabase.from('settings').select('*'),
        ])
        setProducts(prods  || [])
        setCategories(cats || [])
        setBrands(brnds    || [])
        setPromos(prs      || [])
        setBanners(bnrs    || [])
        setSettings(stgs   || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // ── بانر تلقائي ──
  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setBannerIdx(i => (i+1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [banners.length])

  // ── تزامن wishlist مع DB ──
  useEffect(() => {
    if (!customer?.id) return
    supabase.from('wishlist').select('product_id').eq('customer_id', customer.id)
      .then(({ data }) => {
        if (data) {
          const ids = data.map(r => String(r.product_id))
          setWishlist(ids)
          localStorage.setItem('safaa_wish', JSON.stringify(ids))
        }
      })
  }, [customer?.id])

  // ── السلة ──
  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id===product.id ? {...i, qty: i.qty+1} : i)
      const disc  = calcPromoDiscount(product, promos)
      const price = Math.max(0, product.price - disc)
      return [...prev, { ...product, qty: 1, price }]
    })
  }

  const cartCount = cart.reduce((s,i) => s+i.qty, 0)
  const cartTotal = cart.reduce((s,i) => s+(i.price*i.qty), 0)

  // ── المفضلة ──
  const toggleWish = async (pid) => {
    const id = String(pid)
    const isIn = wishlist.includes(id)
    const newW = isIn ? wishlist.filter(x=>x!==id) : [...wishlist, id]
    setWishlist(newW)
    localStorage.setItem('safaa_wish', JSON.stringify(newW))
    if (customer?.id) {
      if (isIn) {
        await supabase.from('wishlist')
          .delete().eq('customer_id', customer.id).eq('product_id', pid)
      } else {
        await supabase.from('wishlist')
          .insert({ customer_id: customer.id, product_id: pid })
          .catch(() => {})
      }
    }
  }

  // ── تسجيل الدخول ──
  const handleLogin = (data) => {
    // نستخدم بيانات RPC مباشرة — id الصحيح هو cust_id
    const freshData = {
      id:              data.id,
      name:            data.name,
      phone:           data.phone,
      email:           data.email,
      address:         data.address,
      tier:            data.tier            || 'M1',
      points:          data.points          || 0,
      total_purchases: data.total_purchases || 0,
      wilaya:          data.wilaya,
      commune:         data.commune,
    }
    setCustomer(freshData)
    localStorage.setItem('safaa_customer', JSON.stringify(freshData))
    setModal(null)
  }

  // ── تحديث النقاط ──
  const handlePointsUpdate = (newPoints) => {
    const updated = { ...customer, points: newPoints, id: customer?.id }
    setCustomer(updated)
    localStorage.setItem('safaa_customer', JSON.stringify(updated))
  }

  // ── المنتجات المصفاة ──
  const now      = new Date()
  const newP     = products.filter(p => new Date(p.created_at) >= sevenAgo)
  const bestSellers = [...products].sort((a,b) => (b.total_sales||0)-(a.total_sales||0)).slice(0,12)

  // ── الـ CSS المتغير ──
  const cssVars = {
    '--clr-primary': primaryColor,
    '--clr-accent':  '#F97316',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:'Tajawal,sans-serif', direction:'rtl' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🌿</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#1E293B' }}>{SNAME}</div>
        <div style={{ fontSize:13, color:'#64748B', marginTop:8 }}>جاري التحميل...</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Tajawal','Cairo',sans-serif", direction:'rtl',
      maxWidth:480, margin:'0 auto', minHeight:'100vh',
      background:'#F8FAFC', ...cssVars }}>

      {/* ── Header ── */}
      <header style={{ position:'sticky', top:0, zIndex:100, background:'white',
        borderBottom:'1px solid #E2E8F0', padding:'10px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:900, fontSize:20, color:'#F97316' }}>{SNAME}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <NotificationBell
            customer={customer}
            primaryColor={primaryColor}
            onNavigate={(type, id) => {
              if (type==='product') {
                const p = products.find(x=>String(x.id)===String(id))
                if (p) setDetailProd(p)
              }
            }}
          />
          {customer && !customer.guest ? (
            <button onClick={() => setModal('account')}
              style={{ background:'#F0FDF4', border:'1px solid #BBF7D0',
                color:'#15803D', borderRadius:20, padding:'6px 14px',
                fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              👤 {customer.name?.split(' ')[0]}
            </button>
          ) : (
            <button onClick={() => setModal('login')}
              style={{ background:'#F97316', color:'white', border:'none',
                borderRadius:20, padding:'7px 16px', fontWeight:800,
                fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              دخول
            </button>
          )}
        </div>
      </header>

      {/* ── المحتوى ── */}
      <div style={{ padding:'16px 16px 100px' }}>
        {tab==='home' && (
          <HomeTab allP={products} newP={newP} bestSellers={bestSellers}
            banners={banners} bannerIdx={bannerIdx} setBannerIdx={setBannerIdx}
            promos={promos} brands={brands} categories={categories}
            brandSel={brandSel} setBrandSel={setBrandSel}
            catSel={catSel} setCatSel={setCatSel}
            setTab={setTab} CUR={CUR} wishlist={wishlist}
            addToCart={addToCart} toggleWish={toggleWish}
            onDetail={setDetailProd} settings={settings} />
        )}
        {tab==='search' && (
          <SearchTab allP={products} promos={promos} CUR={CUR}
            wishlist={wishlist} addToCart={addToCart} toggleWish={toggleWish}
            onDetail={setDetailProd} categories={categories} brands={brands} />
        )}
        {tab==='wish' && (
          <WishTab allP={products} wishlist={wishlist} promos={promos} CUR={CUR}
            addToCart={addToCart} toggleWish={toggleWish} onDetail={setDetailProd} />
        )}
        {tab==='orders' && (
          <OrdersTab customer={customer} CUR={CUR} />
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480, background:'white',
        borderTop:'1px solid #E2E8F0', display:'flex',
        zIndex:100 }}>
        {[
          { id:'home',   icon:'🏠', label:'الرئيسية' },
          { id:'search', icon:'🔍', label:'البحث' },
          { id:'wish',   icon:'❤️', label:'المفضلة' },
          { id:'orders', icon:'📦', label:'طلبياتي' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:'10px 0', background:'none', border:'none',
              cursor:'pointer', fontFamily:'inherit', display:'flex',
              flexDirection:'column', alignItems:'center', gap:2,
              color: tab===t.id ? '#F97316' : '#94A3B8' }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:700 }}>{t.label}</span>
          </button>
        ))}
        {/* زر السلة */}
        <button onClick={() => setModal('cart')}
          style={{ flex:1, padding:'10px 0', background:'none', border:'none',
            cursor:'pointer', fontFamily:'inherit', display:'flex',
            flexDirection:'column', alignItems:'center', gap:2,
            color:'#94A3B8', position:'relative' }}>
          <span style={{ fontSize:20 }}>🛒</span>
          <span style={{ fontSize:10, fontWeight:700 }}>السلة</span>
          {cartCount > 0 && (
            <span style={{ position:'absolute', top:6, right:'50%', marginRight:-18,
              background:'#EF4444', color:'white', borderRadius:'50%',
              width:18, height:18, fontSize:10, fontWeight:900,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {cartCount}
            </span>
          )}
        </button>
      </nav>

      {/* ── Modals ── */}
      {detailProd && (
        <DetailModal product={detailProd} wishlist={wishlist} promos={promos} CUR={CUR}
          onClose={() => setDetailProd(null)} addToCart={addToCart} toggleWish={toggleWish} />
      )}
      {modal==='login'    && <LoginModal    onClose={() => setModal(null)} onLogin={handleLogin}
                               onRegister={() => setModal('register')} />}
      {modal==='register' && <RegisterModal onClose={() => setModal(null)}
                               onSuccess={() => setModal('login')} />}
      {modal==='cart'     && <CartModal cart={cart} setCart={setCart} CUR={CUR}
                               onClose={() => setModal(null)}
                               onCheckout={() => setModal('checkout')} />}
      {modal==='checkout' && <CheckoutModal cart={cart} CUR={CUR}
                               customer={customer} settings={settings}
                               promos={promos}
                               onClose={() => setModal('cart')}
                               onPointsUpdate={handlePointsUpdate}
                               onSuccess={(id) => {
                                 setCart([])
                                 setThankId(id)
                                 setModal('thank')
                               }} />}
      {modal==='account'  && <AccountModal customer={customer} CUR={CUR}
                               onClose={() => setModal(null)}
                               onLogout={() => {
                                 setCustomer(null)
                                 localStorage.removeItem('safaa_customer')
                                 setModal(null)
                               }} />}

      {/* شكراً */}
      {modal==='thank' && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:600,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'white',borderRadius:24,padding:32,textAlign:'center',maxWidth:320,width:'100%' }}>
            <div style={{ fontSize:56,marginBottom:16 }}>🎉</div>
            <h2 style={{ fontSize:22,fontWeight:900,color:'#1E293B',marginBottom:8 }}>تم تأكيد طلبك!</h2>
            <p style={{ fontSize:14,color:'#64748B',marginBottom:8 }}>
              رقم الطلبية: <strong>#{thankId}</strong>
            </p>
            <p style={{ fontSize:13,color:'#64748B',marginBottom:24 }}>
              سيتم التواصل معك قريباً لتأكيد التوصيل.
            </p>
            <button onClick={() => { setModal(null); setTab('orders') }}
              style={{ background:'#F97316',color:'white',border:'none',borderRadius:12,
                padding:'12px 28px',fontWeight:900,fontSize:14,cursor:'pointer',fontFamily:'inherit' }}>
              تتبع طلبيتي 📦
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
