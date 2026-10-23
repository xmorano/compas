import json, urllib.request, urllib.error, http.cookiejar
BASE='http://127.0.0.1:8123/clases/api/index.php?action='
class Client:
 def __init__(self):
  self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));self.csrf=''
 def call(self,action,body=None,expected=200,csrf=None):
  headers={'Content-Type':'application/json','X-CSRF-Token':self.csrf if csrf is None else csrf}
  req=urllib.request.Request(BASE+action,data=None if body is None else json.dumps(body).encode(),headers=headers)
  try:r=self.opener.open(req)
  except urllib.error.HTTPError as e:r=e
  data=json.load(r)
  assert r.status==expected,(action,r.status,data,expected)
  if 'csrf' in data:self.csrf=data['csrf']
  return data
admin=Client();assert admin.call('bootstrap')['needsSetup']
admin.call('workspace',expected=401)
admin.call('setup',{},expected=403,csrf='bad')
a=admin.call('setup',{'setup_key':'test-only-installation-key-123456789','name':'Admin','email':'admin@example.test','password':'Admin-test-123456'})
assert a['user']['role']=='admin'
empty={'centers':[],'groups':[],'coreos':[],'sessions':[]}
assert admin.call('workspace')['data']==empty
teacher=Client();teacher.call('bootstrap')
token=admin.call('invite',{'kind':'invite','email':'teacher@example.test'})['token']
u=teacher.call('claim',{'token':token,'name':'Profe','password':'Teacher-test-123456'})
assert u['user']['role']=='teacher'
other=Client();other.call('bootstrap');other.call('claim',{'token':token,'name':'Intruso','password':'Teacher-test-123456'},expected=400)
teacher.call('users',expected=403);teacher.call('invite',{'kind':'invite','email':'someone@example.test'},expected=403)
coreo={'id':'coreo1','name':'Baile común','level':'Iniciación','author':'Autor','walls':4,'counts':32,'music':'https://example.com/music','video':'https://example.com/video','sheet':''}
admin.call('library',{'version':0,'coreos':[coreo]})
assert teacher.call('library')['coreos'][0]['name']=='Baile común'
teacher.call('library',{'version':1,'coreos':[]},expected=403)
private={**empty,'centers':[{'id':'center1','name':'Centro privado','address':'Dirección'}],'coreos':[{**coreo,'id':'private1','libraryId':'coreo1','name':'Mi versión'}]}
teacher.call('workspace',{'version':0,'data':private,'user_id':a['user']['id']})
assert teacher.call('workspace')['data']==private
assert admin.call('workspace')['data']==empty
assert teacher.call('library')['coreos'][0]['name']=='Baile común'
teacher.call('workspace',{'version':0,'data':empty},expected=409)
assert teacher.call('workspace')['data']==private
bad={**empty,'groups':[{'id':'g','center':'missing','level':'Inicial','day':'Lunes','start':'19:00','end':'20:00'}]}
teacher.call('workspace',{'version':1,'data':bad},expected=400)
teacher.call('workspace',{'version':1,'data':empty},expected=403,csrf='invalid')
reset=admin.call('invite',{'kind':'reset','email':'teacher@example.test'})['token']
other.call('claim',{'token':reset,'name':'Profe','password':'Changed-test-123456'})
teacher.call('workspace',expected=401)
assert other.call('workspace')['data']==private
other.call('password',{'current_password':'Changed-test-123456','password':'Another-test-123456'})
other.call('logout',{});other.call('workspace',expected=401)
print('API: cuentas, invitaciones de un uso, permisos, aislamiento, catálogo común, copias privadas, conflictos, validación, CSRF, recuperación y cierre correctos.')
