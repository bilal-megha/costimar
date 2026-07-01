export default function AccountModal({ customer, CUR, onClose, onLogout }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',width:'100%',
        maxWidth:480,padding:28 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',margin:0 }}>👤 حسابي</h2>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18 }}>✕</button>
        </div>

        {/* بيانات العميل */}
        <div style={{ background:'#F8FAFC',borderRadius:16,padding:16,marginBottom:20 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:14 }}>
            <div style={{ width:56,height:56,borderRadius:'50%',background:'#F97316',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'white',fontWeight:900 }}>
              {customer?.name?.[0]}
            </div>
            <div>
              <div style={{ fontWeight:900,fontSize:16,color:'#1E293B' }}>{customer?.name}</div>
              <div style={{ fontSize:13,color:'#64748B' }}>{customer?.phone}</div>
            </div>
          </div>

          {/* إحصائيات */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
            {[
              { label:'نقاطي',    value: customer?.points || 0,             icon:'⭐', color:'#F97316' },
              { label:'الرتبة',   value: customer?.tier   || 'M1',          icon:'🏅', color:'#8B5CF6' },
              { label:'إجمالي',  value:`${(customer?.total_purchases||0).toFixed(0)} ${CUR}`, icon:'💰', color:'#10B981' },
            ].map(s => (
              <div key={s.label} style={{ background:'white',borderRadius:12,padding:12,textAlign:'center',
                boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:15,fontWeight:900,color:s.color,margin:'4px 0' }}>{s.value}</div>
                <div style={{ fontSize:11,color:'#64748B',fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onLogout}
          style={{ width:'100%',padding:'13px',background:'#FEE2E2',color:'#DC2626',
            border:'none',borderRadius:12,fontSize:15,fontWeight:900,cursor:'pointer',fontFamily:'inherit' }}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
