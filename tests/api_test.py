import json, urllib.request, urllib.error, http.cookiejar
BASE='http://127.0.0.1:8123/clases/api/index.php?action='
class Client:
 def __init__(self):
  self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));self.csrf=''
 def call(self,action,body=None,expected=200,csrf=None):
  if action in ('library-seen','library-ignore') and body is not None and 'versions' not in body and all(isinstance(i,str) for i in body.get('ids',[])):
   body={**body,'versions':{c['id']:c.get('publicationVersion',0) for c in self.call('library')['coreos'] if c['id'] in body['ids']}}
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
token=admin.call('invite',{'kind':'invite','name':'Profe','email':'teacher@example.test'})['token']
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
assert admin.call('teacher-workspace&user_id='+u['user']['id'])['data']==private
teacher.call('teacher-workspace&user_id='+a['user']['id'],expected=403)
admin.call('teacher-workspace&user_id='+'0'*32,expected=404)
admin.call('teacher-workspace',{},expected=404)
assert teacher.call('workspace&user_id='+a['user']['id'])['data']==private
assert teacher.call('library')['coreos'][0]['name']=='Baile común'
teacher.call('workspace',{'version':0,'data':empty},expected=409)
assert teacher.call('workspace')['data']==private
bad={**empty,'groups':[{'id':'g','center':'missing','level':'Inicial','day':'Lunes','start':'19:00','end':'20:00'}]}
teacher.call('workspace',{'version':1,'data':bad},expected=400)
teacher.call('workspace',{'version':1,'data':empty},expected=403,csrf='invalid')
# Unread publications are per account; sharing the same routine again generates a fresh notice.
assert teacher.call('notifications')['newCoreos']==1
teacher.call('library-seen',{'ids':['coreo1']})
teacher.call('library-seen',{'ids':['coreo1']})
assert teacher.call('notifications')['newCoreos']==0
assert admin.call('notifications')['newCoreos']==0
admin.call('library',{'version':1,'coreos':[{**coreo,'name':'Baile común actualizado'}]})
assert teacher.call('library')['unseenIds']==['coreo1']
admin.call('library',{'version':2,'coreos':[{**coreo,'id':'coreo2','name':'Segunda publicación'}]})
assert len(teacher.call('library')['coreos'])==2
assert next(c for c in teacher.call('library')['coreos'] if c['id']=='coreo1')['name']=='Baile común actualizado'
teacher.call('library-seen',{'ids':['coreo1']})
assert teacher.call('library')['unseenIds']==['coreo2']
teacher.call('library-seen',{'ids':[{}]},expected=400)
teacher.call('library-seen',{'ids':['coreo2']},expected=403,csrf='invalid')
# The server copies only a teacher's own saved routine, never an arbitrary payload.
teacher.call('suggestions',{'source_id':'missing'},expected=404)
suggestion=teacher.call('suggestions',{'source_id':'private1','user_id':a['user']['id'],'coreo':coreo})['id']
teacher.call('suggestions',{'source_id':'private1'},expected=409)
assert admin.call('notifications')['pendingSuggestions']==1
assert teacher.call('notifications')['pendingSuggestions']==0
rows=admin.call('suggestions')['suggestions']
assert rows[0]['teacher_name']=='Profe' and rows[0]['coreo']['name']=='Mi versión'
assert 'libraryId' not in rows[0]['coreo']
other.call('suggestions',expected=401)
teacher.call('review-suggestion',{'id':suggestion,'decision':'accepted'},expected=403)
admin.call('review-suggestion',{'id':suggestion,'decision':'invalid'},expected=400)
admin.call('review-suggestion',{'id':suggestion,'decision':'accepted','coreo':{**private['coreos'][0],'author':'Autor corregido'},'review_note':'Autor corregido para publicar'})
admin.call('review-suggestion',{'id':suggestion,'decision':'accepted'},expected=409)
assert admin.call('notifications')['pendingSuggestions']==0
assert teacher.call('suggestions')['suggestions'][0]['status']=='accepted'
published=next(c for c in teacher.call('library')['coreos'] if c['id']=='suggestion_'+suggestion)
assert published['name']=='Mi versión'
assert published['author']=='Autor corregido'
assert teacher.call('coreo-states')['states']['private1']=='accepted'
assert teacher.call('suggestions')['suggestions'][0]['review_note']=='Autor corregido para publicar'
assert teacher.call('suggestions')['suggestions'][0]['reviewedCoreo']['author']=='Autor corregido'
assert teacher.call('workspace')['data']==private
# Approved data is a snapshot; subsequent private edits do not affect publication.
private['coreos'][0]['name']='Cambio privado posterior'
private['coreos'].append({**coreo,'id':'private2','name':'No publicar'})
teacher.call('workspace',{'version':1,'data':private})
rejected=teacher.call('suggestions',{'source_id':'private2'})['id']
admin.call('review-suggestion',{'id':rejected,'decision':'rejected'},expected=400)
assert teacher.call('coreo-states')['states']['private2']=='pending'
admin.call('review-suggestion',{'id':rejected,'decision':'rejected','review_note':'Falta la hoja de pasos'})
assert teacher.call('coreo-states')['states']['private2']=='rejected'
assert next(s for s in teacher.call('suggestions')['suggestions'] if s['id']==rejected)['review_note']=='Falta la hoja de pasos'
assert not any(c['name']=='No publicar' for c in teacher.call('library')['coreos'])
assert next(c for c in teacher.call('library')['coreos'] if c['id']==published['id'])['name']=='Mi versión'
# An authenticated third account cannot see the first teacher's suggestions.
third=Client();third.call('bootstrap')
third_token=admin.call('invite',{'kind':'invite','name':'Otra profe','email':'third@example.test'})['token']
third.call('claim',{'token':third_token,'name':'Otra profe','password':'Third-test-123456'})
assert third.call('suggestions')['suggestions']==[]
assert third.call('notifications')['newCoreos']==3
assert teacher.call('notifications')['newCoreos']==2
# Ignoring affects only this account and publication; a stale dismissal cannot hide a re-share.
old=teacher.call('library')
old_version=next(c['publicationVersion'] for c in old['coreos'] if c['id']=='coreo2')
teacher.call('library-ignore',{'ids':['coreo2']})
assert 'coreo2' not in teacher.call('library')['unseenIds']
assert 'coreo2' in third.call('library')['unseenIds']
assert any(c['id']=='coreo2' for c in teacher.call('library')['coreos'])
assert teacher.call('workspace')['data']==private
admin.call('library',{'version':old['version'],'coreos':[{**coreo,'id':'coreo2','name':'Segunda publicación'}]})
assert 'coreo2' in teacher.call('library')['unseenIds']
teacher.call('library-ignore',{'ids':['coreo2'],'versions':{'coreo2':old_version}})
assert 'coreo2' in teacher.call('library')['unseenIds']
teacher.call('library-ignore',{'ids':['coreo2'],'versions':{'coreo2':999999}},expected=400)
teacher.call('library-ignore',{'ids':['coreo2']},csrf='invalid',expected=403)
teacher.call('library-ignore',{'ids':['coreo2']})
assert 'coreo2' not in teacher.call('library')['unseenIds']
assert admin.call('notifications')['newCoreos']==0
# An empty publication never clears existing shared routines; stale versions still fail.
before=admin.call('library')
admin.call('library',{'version':before['version'],'coreos':[]})
assert admin.call('library')['coreos']==before['coreos']
admin.call('library',{'version':before['version'],'coreos':[]},expected=409)
reset=admin.call('invite',{'kind':'reset','email':'teacher@example.test'})['token']
other.call('claim',{'token':reset,'name':'Profe','password':'Changed-test-123456'})
teacher.call('workspace',expected=401)
assert other.call('workspace')['data']==private
other.call('password',{'current_password':'Changed-test-123456','password':'Another-test-123456'})
other.call('logout',{});other.call('workspace',expected=401)
# Withdrawal is admin-only, reversible, versioned, and preserves teacher copies.
third_library=third.call('library')
source=next(c for c in third_library['coreos'] if c['id']=='coreo2')
third_private={**empty,'coreos':[{**source,'id':'thirdcopy','libraryId':'coreo2'}]}
third.call('workspace',{'version':0,'data':third_private})
third.call('library-ignore',{'ids':['coreo2']})
current=admin.call('library')
third.call('library-unpublish',{'version':current['version'],'ids':['coreo2']},expected=403)
admin.call('library-unpublish',{'version':current['version'],'ids':['coreo2']},csrf='bad',expected=403)
admin.call('library-unpublish',{'version':current['version'],'ids':['coreo2']})
assert not any(c['id']=='coreo2' for c in third.call('library')['coreos'])
assert next(c for c in admin.call('library')['coreos'] if c['id']=='coreo2')['published'] is False
assert third.call('workspace')['data']==third_private
admin.call('library-unpublish',{'version':current['version'],'ids':['coreo1']},expected=409)
current=admin.call('library')
admin.call('library',{'version':current['version'],'coreos':[coreo]})
assert next(c for c in admin.call('library')['coreos'] if c['id']=='coreo2')['published'] is False
current=admin.call('library')
admin.call('library',{'version':current['version'],'coreos':[source]})
assert next(c for c in third.call('library')['coreos'] if c['id']=='coreo2')['published'] is True
assert 'coreo2' in third.call('library')['unseenIds']
assert third.call('workspace')['data']==third_private
# Optional students and attendance stay in the existing per-user workspace JSON.
attendance_workspace={**third_private,
 'centers':[{'id':'attendance-center','name':'Centro asistencia','address':'Calle'}],
 'groups':[{'id':gid,'center':'attendance-center','level':'Inicial','day':'Lunes','start':'19:00','end':'20:00'} for gid in ['attendance-group','different-group']],
 'students':[{'id':'student-one','group':'attendance-group','name':'Ana','active':True},{'id':'student-other','group':'different-group','name':'Luis','active':True}],
 'sessions':[{'id':'attendance-session','group':'attendance-group','date':'2026-10-23','start':'19:00','end':'20:00','term':'T1','closed':True,'items':[{'coreo':'thirdcopy','done':True,'planned':True,'mode':'Nueva','note':'Privado'}],'attendance':[{'student':'student-one','status':'present'}]}]}
v=third.call('workspace')['version']
third.call('workspace',{'version':v,'data':attendance_workspace})
assert third.call('workspace')['data']==attendance_workspace
v=third.call('workspace')['version']
for entries in [[{'student':'student-other','status':'present'}],[{'student':'missing','status':'present'}],[{'student':'student-one','status':'unknown'}],[{'student':'student-one','status':'present'}]*2]:
 invalid={**attendance_workspace,'sessions':[{**attendance_workspace['sessions'][0],'attendance':entries}]}
 third.call('workspace',{'version':v,'data':invalid},expected=400)
invalid={**attendance_workspace,'students':[{**attendance_workspace['students'][0],'group':'missing'}]}
third.call('workspace',{'version':v,'data':invalid},expected=400)
assert third.call('workspace')['data']==attendance_workspace
assert admin.call('workspace')['data']==empty
# One profile can belong to multiple groups; former memberships preserve historical attendance.
profile={'id':'student-one','name':'Ana','active':True,'groups':['attendance-group','different-group'],'pastGroups':[],
 'phone':'600123456','email':'ana@example.test','photo':'https://example.test/ana.jpg','level':'Intermedio','notes':'Nota privada'}
expanded={**attendance_workspace,'studentsEnabled':True,'students':[profile,attendance_workspace['students'][1]],
 'sessions':[attendance_workspace['sessions'][0],{**attendance_workspace['sessions'][0],'id':'second-attendance','group':'different-group','attendance':[{'student':'student-one','status':'absent'}]}]}
v=third.call('workspace')['version'];third.call('workspace',{'version':v,'data':expanded})
assert third.call('workspace')['data']==expanded
expanded['students'][0]={**profile,'groups':['different-group'],'pastGroups':['attendance-group']}
expanded['studentsEnabled']=False
v=third.call('workspace')['version'];third.call('workspace',{'version':v,'data':expanded})
assert third.call('workspace')['data']==expanded
v=third.call('workspace')['version']
for change in [{'groups':['different-group','different-group']},{'groups':['foreign-group']},{'email':'bad-email'},{'photo':'data:image/svg+xml;base64,PHN2Zz4='},{'phone':'x'*81}]:
 invalid={**expanded,'students':[{**expanded['students'][0],**change},expanded['students'][1]]}
 third.call('workspace',{'version':v,'data':invalid},expected=400)
third.call('workspace',{'version':v,'data':{**expanded,'studentsEnabled':'yes'}},expected=400)
assert third.call('workspace')['data']==expanded
print('API: cuentas, invitaciones de un uso, permisos, aislamiento, catálogo común, copias privadas, conflictos, validación, CSRF, recuperación y cierre correctos.')
