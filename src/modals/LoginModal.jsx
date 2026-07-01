import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function LoginModal({ onClose, onLogin, onRegister }) {
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async () => {
    if (!phone || !password) { setError('أدخل رقم الهاتف وكلمة المرور'); return }
    setLoading(true); setError('')
    try {
      const { data, error: e } = await supabase.rpc('verify_customer_login', {
        p_phone: phone, p_password: password
      })
      if (e || !data?.length) { setError('رقم الهاتف أو كلمة المرور غير صحيحة'); return }
      const r = data[0]
      onLogin({
        id:              r.cust_id,
        name:            r.cust_name,
        phone:           r.cust_phone,
        email:           r.cust_email,
        address:         r.cust_address,
        tier:            r.cust_tier    || 'M1',
        points:          r.cust_points  || 0,
        total_purchases: r.cust_total   || 0,
        wilaya:          r.cust_wilaya,
        commune:         r.cust_commune,
      })
    } catch { setError('حدث خطأ، حاول مجدداً')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',width:'100%',
        maxWidth:480,padding:28 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',margin:0 }}>🔐 تسجيل الدخول</h2>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18 }}>✕</button>
        </div>
        {error && (
          <div style={{ background:'#FEE2E2',color:'#DC2626',borderRadius:10,
            padding:'10px 14px',fontSize:13,fontWeight:700,marginBottom:14 }}>❌ {error}</div>
        )}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#64748B',marginBottom:5 }}>رقم الهاتف</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)}
            style={{ width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',
              fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',direction:'ltr',textAlign:'right' }}
            placeholder="0XXXXXXXXX" />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#64748B',marginBottom:5 }}>كلمة المرور</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handle()}
            style={{ width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',
              fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
            placeholder="••••••" />
        </div>
        <button onClick={handle} disabled={loading}
          style={{ width:'100%',padding:'13px',background:loading?'#94A3B8':'#F97316',
            color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:900,
            cursor:loading?'default':'pointer',fontFamily:'inherit' }}>
          {loading ? '⏳ جاري الدخول...' : 'دخول'}
        </button>
        <p style={{ textAlign:'center',fontSize:13,color:'#64748B',marginTop:16 }}>
          ليس لديك حساب؟{' '}
          <button onClick={onRegister}
            style={{ background:'none',border:'none',color:'#F97316',fontWeight:800,
              cursor:'pointer',fontFamily:'inherit',fontSize:13 }}>
            إنشاء حساب
          </button>
        </p>
      </div>
    </div>
  )
}
