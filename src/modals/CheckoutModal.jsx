import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function CheckoutModal({ cart, CUR, customer, settings, promos, onClose, onSuccess, onPointsUpdate }) {
  const [form, setForm] = useState({
    name:    customer?.name    || '',
    phone:   customer?.phone   || '',
    address: customer?.address || '',
    notes:   '',
  })
  const [coupons,     setCoupons]     = useState([])
  const [selCoupon,   setSelCoupon]   = useState(null)
  const [couponCode,  setCouponCode]  = useState('')
  const [couponError, setCouponError] = useState('')
  const [usePoints,   setUsePoints]   = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const getSetting   = k => settings?.find?.(s=>s.key===k)?.value
  const pointsPerOrder = parseFloat(getSetting('points_per_order') || '100')
  const pointsToDzd    = parseFloat(getSetting('points_to_dzd')    || '1')
  const currentPoints  = customer?.points || 0

  const cartTotal    = cart.reduce((s,i) => s+(i.price*i.qty), 0)
  const couponDisc   = selCoupon
    ? selCoupon.type==='percent'
      ? (cartTotal * selCoupon.value/100)
      : selCoupon.value
    : 0

  // الحد الأقصى للنقاط = min(نقاط العميل, قيمة الطلبية بعد الكوبون)
  const afterCoupon      = Math.max(0, cartTotal - couponDisc)
  const maxPointsAllowed = Math.min(currentPoints, Math.floor(afterCoupon / pointsToDzd))
  const pointsDisc       = usePoints ? Math.min(pointsToUse * pointsToDzd, afterCoupon) : 0
  const grandTotal       = Math.max(0, afterCoupon - pointsDisc)
  const pointsEarned     = usePoints ? 0 : Math.floor(grandTotal / pointsPerOrder)

  // إعادة ضبط pointsToUse عند تغيير الحد
  useEffect(() => {
    if (pointsToUse > maxPointsAllowed) setPointsToUse(maxPointsAllowed)
  }, [maxPointsAllowed])

  // تحميل الكوبونات
  useEffect(() => {
    supabase.from('coupons').select('*').eq('active', true)
      .then(({ data }) => {
        const now = new Date()
        setCoupons((data||[]).filter(c =>
          (!c.expires_at || new Date(c.expires_at) > now) &&
          (!c.max_uses   || (c.used_count||0) < c.max_uses) &&
          (c.min_order||0) <= cartTotal
        ))
      })
  }, [cartTotal])

  const applyCoupon = () => {
    const c = coupons.find(x => x.code.toUpperCase() === couponCode.toUpperCase().trim())
    if (!c) { setCouponError('كود غير صحيح أو منتهي'); return }
    setSelCoupon(c); setCouponError('')
  }

  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const confirm = async () => {
    if (!form.name||!form.phone||!form.address) { setError('الاسم والهاتف والعنوان مطلوبة'); return }
    setLoading(true); setError('')
    try {
      // ✅ customer_id الحقيقي مباشرة من بيانات العميل
      const customerId = (customer && !customer.guest && customer.id)
        ? parseInt(customer.id) : null

      const { data: inserted, error: e } = await supabase.from('orders').insert({
        customer_id:     customerId,
        customer_name:   form.name,
        customer_phone:  form.phone,
        customer_address:form.address,
        notes:           form.notes || null,
        items:           JSON.stringify(cart.map(i=>({ id:i.id, name:i.name, qty:i.qty, price:i.price }))),
        total:           grandTotal,
        status:          'processing',
        coupon_code:     selCoupon?.code   || null,
        coupon_discount: couponDisc        || 0,
        coupon_used_by_customer: !!selCoupon,
        points_used:     usePoints ? pointsToUse : 0,
        pay_mode:        'cash',
        created_at:      new Date().toISOString(),
        date:            new Date().toLocaleDateString('ar-DZ'),
      }).select('id').single()

      if (e) { setError('خطأ في إنشاء الطلبية: ' + e.message); return }

      const orderId = inserted.id

      // ✅ تحديث used_count الكوبون
      if (selCoupon?.id) {
        await supabase.from('coupons')
          .update({ used_count: (selCoupon.used_count||0) + 1 })
          .eq('id', selCoupon.id).catch(() => {})
      }

      // ✅ تحديث نقاط العميل في DB
      if (customerId) {
        let newPoints = currentPoints
        if (usePoints && pointsToUse > 0) {
          newPoints = Math.max(0, currentPoints - pointsToUse)
        } else if (!usePoints && pointsEarned > 0) {
          newPoints = currentPoints + pointsEarned
        }
        if (newPoints !== currentPoints) {
          await supabase.from('customers')
            .update({ points: newPoints, total_purchases: (customer.total_purchases||0) + grandTotal })
            .eq('id', customerId).catch(() => {})
          onPointsUpdate(newPoints)
        }
      }

      onSuccess(orderId)
    } catch (err) {
      setError('حدث خطأ: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',width:'100%',
        maxWidth:480,maxHeight:'92vh',overflowY:'auto',padding:24 }}
        onClick={e=>e.stopPropagation()}>

        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',margin:0 }}>✅ تأكيد الطلبية</h2>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18 }}>✕</button>
        </div>

        {error && <div style={{ background:'#FEE2E2',color:'#DC2626',borderRadius:10,
          padding:'10px 14px',fontSize:13,fontWeight:700,marginBottom:14 }}>❌ {error}</div>}

        {/* بيانات التوصيل */}
        {[
          { key:'name',    label:'الاسم الكامل *',  type:'text',ph:'أحمد محمد' },
          { key:'phone',   label:'رقم الهاتف *',    type:'tel', ph:'0XXXXXXXXX' },
          { key:'address', label:'العنوان الكامل *', type:'text',ph:'الولاية، البلدية، الشارع' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#64748B',marginBottom:4 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={F(f.key)} placeholder={f.ph}
              style={{ width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',
                fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }} />
          </div>
        ))}

        {/* ملاحظات */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#64748B',marginBottom:4 }}>ملاحظات (اختياري)</label>
          <textarea value={form.notes} onChange={F('notes')} rows={2}
            placeholder="أي ملاحظات خاصة بطلبيتك..."
            style={{ width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',
              fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'none' }} />
        </div>

        {/* كوبون */}
        <div style={{ background:'#F8FAFC',borderRadius:14,padding:14,marginBottom:14 }}>
          <div style={{ fontWeight:800,fontSize:14,color:'#1E293B',marginBottom:10 }}>🎟️ كوبون خصم</div>
          {selCoupon ? (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
              background:'#FFF7ED',border:'2px solid #F97316',borderRadius:10,padding:'10px 14px' }}>
              <div>
                <div style={{ fontWeight:900,color:'#F97316',fontFamily:'monospace',fontSize:15 }}>{selCoupon.code}</div>
                <div style={{ fontSize:12,color:'#92400E',marginTop:2 }}>
                  خصم {selCoupon.type==='percent' ? `${selCoupon.value}%` : `${selCoupon.value} ${CUR}`}
                </div>
              </div>
              <button onClick={() => { setSelCoupon(null); setCouponCode('') }}
                style={{ background:'#FEE2E2',color:'#DC2626',border:'none',borderRadius:8,
                  padding:'4px 10px',fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>✕</button>
            </div>
          ) : (
            <>
              <div style={{ display:'flex',gap:8,marginBottom:couponError?8:0 }}>
                <input value={couponCode} onChange={e=>setCouponCode(e.target.value)}
                  placeholder="أدخل كود الكوبون"
                  style={{ flex:1,padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',
                    fontSize:13,fontFamily:'inherit',outline:'none' }} />
                <button onClick={applyCoupon}
                  style={{ background:'#F97316',color:'white',border:'none',borderRadius:10,
                    padding:'10px 16px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',fontSize:13 }}>
                  تطبيق
                </button>
              </div>
              {couponError && <div style={{ fontSize:12,color:'#DC2626',fontWeight:700 }}>{couponError}</div>}
              {/* قائمة الكوبونات المتاحة */}
              {coupons.length > 0 && (
                <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:8 }}>
                  {coupons.map(c => (
                    <button key={c.id} onClick={() => { setSelCoupon(c); setCouponCode(c.code) }}
                      style={{ padding:'4px 12px',borderRadius:20,border:'1.5px solid #E2E8F0',
                        background:'white',fontWeight:700,fontSize:11,cursor:'pointer',
                        fontFamily:'inherit',color:'#F97316' }}>
                      {c.code} ({c.type==='percent'?`${c.value}%`:`${c.value} ${CUR}`})
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* النقاط */}
        {customer && !customer.guest && currentPoints > 0 && (
          <div style={{ background:'#F0FDF4',border:'1.5px solid #BBF7D0',borderRadius:14,padding:14,marginBottom:14 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
              <div style={{ fontWeight:800,fontSize:14,color:'#14532D' }}>
                ⭐ نقاطك: <span style={{ color:'#F97316',fontWeight:900 }}>{currentPoints}</span>
                <span style={{ fontSize:11,color:'#64748B',marginRight:4 }}>
                  (يعادل {Math.round(currentPoints*pointsToDzd)} {CUR})
                </span>
              </div>
              <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer' }}>
                <input type="checkbox" checked={usePoints}
                  onChange={e => { setUsePoints(e.target.checked); if(!e.target.checked) setPointsToUse(0) }}
                  style={{ accentColor:'#F97316',width:16,height:16 }} />
                <span style={{ fontSize:12,fontWeight:700,color:'#15803D' }}>استخدام</span>
              </label>
            </div>

            {usePoints && maxPointsAllowed > 0 && (
              <div>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6 }}>
                  <span style={{ fontWeight:700,color:'#15803D' }}>
                    النقاط المستخدمة: <span style={{ color:'#F97316' }}>{pointsToUse}</span>
                  </span>
                  <span style={{ color:'#64748B' }}>الحد: {maxPointsAllowed}</span>
                </div>
                <input type="range" min={0} max={maxPointsAllowed}
                  value={pointsToUse}
                  onChange={e => setPointsToUse(parseInt(e.target.value))}
                  style={{ width:'100%',accentColor:'#F97316' }} />
                <div style={{ textAlign:'center',fontSize:12,color:'#15803D',fontWeight:800,marginTop:4 }}>
                  = {(pointsToUse*pointsToDzd).toFixed(0)} {CUR} خصم
                </div>
              </div>
            )}

            {usePoints && maxPointsAllowed === 0 && (
              <div style={{ fontSize:12,color:'#DC2626',fontWeight:700 }}>
                ⚠️ نقاطك غير كافية لخصم أي مبلغ من هذه الطلبية
              </div>
            )}

            {!usePoints && pointsEarned > 0 && (
              <div style={{ fontSize:12,color:'#15803D',fontWeight:700,marginTop:4 }}>
                💰 ستكسب {pointsEarned} نقطة من هذه الطلبية
              </div>
            )}
          </div>
        )}

        {/* ملخص السعر */}
        <div style={{ background:'#1E293B',borderRadius:14,padding:16,marginBottom:20 }}>
          {[
            { label:'مجموع المنتجات', value:`${cartTotal.toFixed(0)} ${CUR}`, color:'white' },
            selCoupon && { label:`خصم كوبون (${selCoupon.code})`, value:`-${couponDisc.toFixed(0)} ${CUR}`, color:'#34D399' },
            usePoints && pointsToUse>0 && { label:'خصم النقاط', value:`-${pointsDisc.toFixed(0)} ${CUR}`, color:'#FCD34D' },
          ].filter(Boolean).map(r => (
            <div key={r.label} style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
              <span style={{ fontSize:13,color:'rgba(255,255,255,.7)' }}>{r.label}</span>
              <span style={{ fontSize:13,fontWeight:700,color:r.color }}>{r.value}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid rgba(255,255,255,.15)',paddingTop:10,marginTop:4,
            display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ color:'rgba(255,255,255,.8)',fontWeight:700 }}>الإجمالي النهائي</span>
            <span style={{ fontSize:22,fontWeight:900,color:'#F97316' }}>{grandTotal.toFixed(0)} {CUR}</span>
          </div>
        </div>

        <button onClick={confirm} disabled={loading}
          style={{ width:'100%',padding:'14px',background:loading?'#94A3B8':'#F97316',
            color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:900,
            cursor:loading?'default':'pointer',fontFamily:'inherit' }}>
          {loading ? '⏳ جاري التأكيد...' : '✅ تأكيد الطلبية'}
        </button>
      </div>
    </div>
  )
}
