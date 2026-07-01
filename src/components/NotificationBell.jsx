import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export default function NotificationBell({ customer, primaryColor = '#2E7D32', onNavigate }) {
  const [notifs,  setNotifs]  = useState([])
  const [open,    setOpen]    = useState(false)
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('safaa_read_notifs') || '[]') } catch { return [] }
  })
  const panelRef = useRef(null)

  const load = async () => {
    try {
      const custId = customer && !customer.guest && customer.id ? parseInt(customer.id) : null
      let query = supabase.from('notifications').select('*')
        .eq('target', 'customer').order('id', { ascending: false }).limit(30)

      if (custId) {
        query = query.or(`customer_id.is.null,customer_id.eq.${custId}`)
      } else {
        query = query.is('customer_id', null)
      }

      const { data } = await query
      if (data) {
        setNotifs(data)
        const dbRead = data.filter(n=>n.is_read).map(n=>String(n.id))
        setReadIds(prev => {
          const merged = [...new Set([...prev,...dbRead])]
          localStorage.setItem('safaa_read_notifs', JSON.stringify(merged))
          return merged
        })
      }
    } catch {}
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('safaa-notifs-customer')
      .on('postgres_changes',{ event:'INSERT',schema:'public',table:'notifications' }, payload => {
        const n = payload.new
        if (n?.target !== 'customer') return
        const custId = customer?.id ? parseInt(customer.id) : null
        if (n.customer_id && custId && n.customer_id !== custId) return
        setNotifs(prev => [n, ...prev])
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [customer?.id])

  useEffect(() => {
    const fn = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const unread = notifs.filter(n => !readIds.includes(String(n.id))).length

  const markRead = async (id) => {
    const newIds = [...new Set([...readIds, String(id)])]
    setReadIds(newIds)
    localStorage.setItem('safaa_read_notifs', JSON.stringify(newIds))
    await supabase.from('notifications').update({ is_read:true }).eq('id', id).catch(()=>{})
  }

  const markAll = async () => {
    const ids = notifs.map(n=>String(n.id))
    setReadIds(ids)
    localStorage.setItem('safaa_read_notifs', JSON.stringify(ids))
    if (notifs.length>0)
      await supabase.from('notifications').update({ is_read:true }).in('id', notifs.map(n=>n.id)).catch(()=>{})
  }

  const handleClick = async (n) => {
    await markRead(n.id)
    setOpen(false)
    if (n.link_type && n.link_type!=='none' && onNavigate)
      onNavigate(n.link_type, n.link_id)
  }

  const timeAgo = (d) => {
    if (!d) return ''
    try {
      const diff = (Date.now()-new Date(d).getTime())/1000
      if (diff<60)    return 'الآن'
      if (diff<3600)  return `${Math.floor(diff/60)} دق`
      if (diff<86400) return `${Math.floor(diff/3600)} س`
      return `${Math.floor(diff/86400)} ي`
    } catch { return '' }
  }

  return (
    <div style={{ position:'relative' }} ref={panelRef}>
      <button onClick={() => setOpen(o=>!o)}
        style={{ background:'rgba(0,0,0,.07)',border:'none',borderRadius:'50%',
          width:38,height:38,cursor:'pointer',fontSize:18,position:'relative',
          display:'flex',alignItems:'center',justifyContent:'center' }}>
        🔔
        {unread>0 && (
          <span style={{ position:'absolute',top:-2,right:-2,background:'#EF4444',color:'white',
            borderRadius:'50%',width:18,height:18,fontSize:10,fontWeight:900,
            display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid white' }}>
            {unread>9?'9+':unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:'absolute',top:46,left:0,width:300,
          maxWidth:'calc(100vw - 28px)',background:'white',borderRadius:18,
          boxShadow:'0 8px 40px rgba(0,0,0,.18)',zIndex:999,overflow:'hidden',
          border:'1px solid #E2E8F0' }}>
          <div style={{ background:`linear-gradient(135deg,${primaryColor},${primaryColor}CC)`,
            padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ color:'white',fontWeight:900,fontSize:14 }}>
              🔔 الإشعارات {unread>0&&`(${unread})`}
            </span>
            {unread>0 && (
              <button onClick={markAll}
                style={{ background:'rgba(255,255,255,.2)',color:'white',border:'none',
                  borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,
                  cursor:'pointer',fontFamily:'inherit' }}>
                قراءة الكل
              </button>
            )}
          </div>
          <div style={{ maxHeight:360,overflowY:'auto' }}>
            {notifs.length===0
              ? <div style={{ textAlign:'center',padding:32,color:'#94A3B8' }}>
                  <div style={{ fontSize:36 }}>🔕</div>
                  <div style={{ fontSize:13,marginTop:8,fontWeight:700 }}>لا توجد إشعارات</div>
                </div>
              : notifs.map(n => {
                  const isUnread = !readIds.includes(String(n.id))
                  return (
                    <div key={n.id} onClick={()=>handleClick(n)}
                      style={{ padding:'12px 16px',borderBottom:'1px solid #F1F5F9',
                        background:isUnread?'#F0F7FF':'white',cursor:'pointer',
                        display:'flex',gap:10,alignItems:'flex-start' }}>
                      <div style={{ width:8,height:8,borderRadius:'50%',marginTop:6,flexShrink:0,
                        background:isUnread?primaryColor:'#E2E8F0' }} />
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:isUnread?900:700,fontSize:13,color:'#1E293B',marginBottom:3 }}>
                          {n.title}
                        </div>
                        {n.body && <div style={{ fontSize:12,color:'#64748B' }}>{n.body}</div>}
                        <div style={{ fontSize:10,color:'#94A3B8',marginTop:4 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}
    </div>
  )
}
