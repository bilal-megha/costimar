import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function RegisterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name:'', phone:'', password:'', confirm:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const handle = async () => {
    if (!form.name||!form.phone||!form.password) { setError('جميع الحقول مطلوبة'); return }
    if (form.password !== form.confirm) { setError('كلمة المرور غير متطابقة'); return }
    if (form.phone.length < 9) { setError('رقم الهاتف غير صحيح'); return }
    setLoading(true); setError('')
    try {
      const { error: e } = await supabase.from('customers').insert({
        name:     form.name.trim(),
        phone:    form.phone.trim(),
        password: form.password,
        points:   0,
        tier:     'M1',
        active:   true,
        created_at: new Date().toISOString(),
      })
      if (e) { setError(e.message.includes('unique') ? 'رقم الهاتف مستخدم بالفعل' : e.message); return }
      onSuccess()
    } catch { setError('حدث خطأ، حاول مجدداً')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',width:'100%',
        maxWidth:480,padding:28,maxHeight:'90vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',margin:0 }}>✏️ إنشاء حساب</h2>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18 }}>✕</button>
        </div>
        {error && <div style={{ background:'#FEE2E2',color:'#DC2626',borderRadius:10,
          padding:'10px 14px',fontSize:13,fontWeight:700,marginBottom:14 }}>❌ {error}</div>}
        {[
          { key:'name',     label:'الاسم الكامل',  type:'text',     ph:'أحمد محمد' },
          { key:'phone',    label:'رقم الهاتف',    type:'tel',      ph:'0XXXXXXXXX' },
          { key:'password', label:'كلمة المرور',   type:'password', ph:'••••••' },
          { key:'confirm',  label:'تأكيد المرور',  type:'password', ph:'••••••' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:14 }}>
            <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#64748B',marginBottom:5 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={F(f.key)}
              placeholder={f.ph}
              style={{ width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',
                fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }} />
          </div>
        ))}
        <button onClick={handle} disabled={loading}
          style={{ width:'100%',padding:'13px',background:loading?'#94A3B8':'#F97316',
            color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:900,
            cursor:loading?'default':'pointer',fontFamily:'inherit',marginTop:6 }}>
          {loading ? '⏳ جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>
      </div>
    </div>
  )
}
