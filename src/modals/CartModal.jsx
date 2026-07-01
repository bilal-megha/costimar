export default function CartModal({ cart, setCart, CUR, onClose, onCheckout }) {
  const total = cart.reduce((s,i) => s + i.price*i.qty, 0)

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(i=>i.id!==id))
    else setCart(prev => prev.map(i=>i.id===id?{...i,qty}:i))
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',width:'100%',
        maxWidth:480,maxHeight:'85vh',display:'flex',flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 20px 12px',borderBottom:'1px solid #F1F5F9',
          display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <h2 style={{ fontSize:18,fontWeight:900,color:'#1E293B',margin:0 }}>🛒 السلة</h2>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',
            borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:18 }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'12px 20px' }}>
          {cart.length===0
            ? <div style={{ textAlign:'center',padding:40,color:'#64748B' }}>
                <div style={{ fontSize:48 }}>🛒</div>
                <div style={{ fontWeight:700,marginTop:8 }}>السلة فارغة</div>
              </div>
            : cart.map(item => (
                <div key={item.id} style={{ display:'flex',alignItems:'center',gap:12,
                  padding:'12px 0',borderBottom:'1px solid #F8FAFC' }}>
                  {item.image
                    ? <img src={item.image} style={{ width:56,height:56,borderRadius:12,objectFit:'cover',flexShrink:0 }} />
                    : <div style={{ width:56,height:56,borderRadius:12,background:'#F1F5F9',
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>📦</div>
                  }
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'#1E293B',
                      overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize:13,fontWeight:900,color:'#F97316',marginTop:2 }}>
                      {(item.price*item.qty).toFixed(0)} {CUR}
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                    <button onClick={()=>updateQty(item.id,item.qty-1)}
                      style={{ width:28,height:28,borderRadius:8,border:'1.5px solid #E2E8F0',
                        background:'white',cursor:'pointer',fontWeight:900,fontSize:16 }}>−</button>
                    <span style={{ fontWeight:800,minWidth:24,textAlign:'center' }}>{item.qty}</span>
                    <button onClick={()=>updateQty(item.id,item.qty+1)}
                      style={{ width:28,height:28,borderRadius:8,border:'none',
                        background:'#F97316',color:'white',cursor:'pointer',fontWeight:900,fontSize:16 }}>+</button>
                  </div>
                </div>
              ))
          }
        </div>
        {cart.length>0 && (
          <div style={{ padding:'16px 20px',borderTop:'1px solid #F1F5F9',flexShrink:0 }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:14 }}>
              <span style={{ fontWeight:700,color:'#64748B' }}>الإجمالي</span>
              <span style={{ fontWeight:900,fontSize:18,color:'#F97316' }}>{total.toFixed(0)} {CUR}</span>
            </div>
            <button onClick={onCheckout}
              style={{ width:'100%',padding:'14px',background:'#F97316',color:'white',
                border:'none',borderRadius:14,fontSize:15,fontWeight:900,cursor:'pointer',fontFamily:'inherit' }}>
              تأكيد الطلبية ✅
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
