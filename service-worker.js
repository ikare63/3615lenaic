const CACHE_VERSION='3615-rappels-v921';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification?.data?.url||'./#rdv',self.location.href).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    for(const client of clients){
      if('navigate' in client){try{await client.navigate(target)}catch(e){}}
      if('focus' in client)return client.focus();
    }
    return self.clients.openWindow?self.clients.openWindow(target):undefined;
  }));
});
