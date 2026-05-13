import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const BINS = [
  'Pain / Fever / Muscle & Joint',
  'Allergy / Respiratory / Steroids',
  'Vitamins / Iron / Supplements',
  'GI / Nausea / Hydration',
  'Cardiac / Blood Pressure / Cholesterol',
  'Diabetes',
  'Antibiotics / Antivirals / Antifungals',
  'Skin / Topicals',
  'Pediatrics Liquids / Drops',
  'IV / Injectable / Urgent Care',
  'Neuro / Chronic / GU',
];

const defaultState = {
  patients: {}, triage: {}, labs: {}, notes: {}, prescriptions: [], checkouts: {},
  medicationCatalog: [
    { id: 1, name: 'Amoxicillin', strength: '500 mg', form: 'Capsule', unit: 'capsules', startingCount: 500, quantityOnHand: 500, usualDispense: 21, bin: 'Antibiotics / Antivirals / Antifungals', patientGroup: 'Both', notes: '', verification: false },
    { id: 2, name: 'Gabapentin', strength: '300 mg', form: 'Capsule', unit: 'capsules', startingCount: 300, quantityOnHand: 300, usualDispense: 30, bin: 'Neuro / Chronic / GU', patientGroup: 'Adult', notes: '', verification: false },
  ],
  inventoryAdjustments: []
};
const load = () => { try { return JSON.parse(localStorage.getItem('clinic')) || defaultState; } catch { return defaultState; } };

function App() {
  const [db, setDb] = useState(load());
  const [screen, setScreen] = useState('home');
  const [msg, setMsg] = useState('');
  const saveDb = (next) => { setDb(next); localStorage.setItem('clinic', JSON.stringify(next)); };
  const today = new Date().toISOString().slice(0, 10);

  const patientLookup = (pid) => db.patients[pid];
  const medicationOptions = db.medicationCatalog.map(m => ({ value: m.id, label: `${m.name} ${m.strength} ${m.form}` }));

  const dailySummary = useMemo(() => {
    const date = today;
    const regs = Object.values(db.patients).filter(p => p.dateOfService === date);
    const checkouts = Object.values(db.checkouts).filter(c => c.checkoutDate === date && c.checkoutComplete).length;
    const labOrders = Object.values(db.labs).filter(l => l.date === date).length;
    const ordered = db.prescriptions.filter(r => r.date === date).length;
    const dispensed = db.prescriptions.filter(r => r.date === date && ['Dispensed','Partial Fill'].includes(r.status)).length;
    const outOfStock = db.prescriptions.filter(r => r.date === date && r.status === 'Out of Stock').length;
    const needReplenishment = db.medicationCatalog.filter(m => m.quantityOnHand <= (m.replenishmentThreshold || 20)).length;
    return { regs: regs.length, checkouts, labOrders, ordered, dispensed, outOfStock, needReplenishment,
      consult: regs.filter(r=>r.services?.includes('Consultation / Labs / Meds')).length,
      minor: regs.filter(r=>r.services?.includes('Minor Surgery')).length,
      circum: regs.filter(r=>r.services?.includes('Circumcision')).length,
      dental: regs.filter(r=>r.services?.includes('Dental Extraction')).length,
      other: regs.filter(r=>r.services?.includes('Others')).length,
    };
  }, [db, today]);

  return <div className="app"><h1>Mobile Mission Clinic App</h1>{msg && <div className="msg">{msg}</div>}
    <Home setScreen={setScreen} />
    {screen==='registration' && <Registration db={db} saveDb={saveDb} setMsg={setMsg} today={today} />}
    {screen==='triage' && <Triage db={db} saveDb={saveDb} setMsg={setMsg} patientLookup={patientLookup} />}
    {screen==='labs' && <Labs db={db} saveDb={saveDb} setMsg={setMsg} today={today} />}
    {screen==='provider' && <Provider db={db} saveDb={saveDb} setMsg={setMsg} />}
    {screen==='prescriptions' && <Prescriptions db={db} saveDb={saveDb} setMsg={setMsg} medicationOptions={medicationOptions} />}
    {screen==='pharmacy' && <Pharmacy db={db} saveDb={saveDb} setMsg={setMsg} today={today} />}
    {screen==='admin' && <Admin db={db} saveDb={saveDb} dailySummary={dailySummary} />}
  </div>
}

const Home = ({ setScreen }) => <div className="grid">{[
  ['registration','Patient Registration, Vitals & Service Requested'],['triage','Nurse Consultation, Triage & Urgent Care'],['labs','Lab Orders & Results'],['provider','Provider Notes & Procedures'],['prescriptions','Prescriptions'],['pharmacy','Pharmacy & Checkout'],['admin','Admin / Pharmacy Menu']
].map(([k,v])=> <button key={k} className="big" onClick={()=>setScreen(k)}>{v}</button>)}</div>;

const Input = ({label,...props}) => <label>{label}<input {...props}/></label>;
function Registration({db,saveDb,setMsg,today}){const[f,sf]=useState({patientId:'',dateOfService:today,services:[]});const save=()=>{if(!f.patientId)return;saveDb({...db,patients:{...db.patients,[f.patientId]:f}});setMsg(`Saved registration for Patient ID ${f.patientId}`)};return <section><h2>Screen 1</h2><Input label='Patient ID' value={f.patientId} onChange={e=>sf({...f,patientId:e.target.value})}/><Input label='Date of service' type='date' value={f.dateOfService} onChange={e=>sf({...f,dateOfService:e.target.value})}/><Input label='Last name' value={f.lastName||''} onChange={e=>sf({...f,lastName:e.target.value})}/><Input label='First name' value={f.firstName||''} onChange={e=>sf({...f,firstName:e.target.value})}/><Input label='Age in years' value={f.ageYears||''} onChange={e=>sf({...f,ageYears:e.target.value})}/><div className='row'>{['Consultation / Labs / Meds','Minor Surgery','Circumcision','Dental Extraction','Others'].map(x=><label key={x}><input type='checkbox' checked={f.services.includes(x)} onChange={e=>sf({...f,services:e.target.checked?[...f.services,x]:f.services.filter(v=>v!==x)})}/>{x}</label>)}</div><Input label='Other service description' value={f.otherServiceDescription||''} onChange={e=>sf({...f,otherServiceDescription:e.target.value})}/><h3>Vitals</h3><div className='row'><Input label='BP systolic' value={f.bpSys||''} onChange={e=>sf({...f,bpSys:e.target.value})}/><Input label='BP diastolic' value={f.bpDia||''} onChange={e=>sf({...f,bpDia:e.target.value})}/><Input label='HR' value={f.hr||''} onChange={e=>sf({...f,hr:e.target.value})}/><Input label='Temperature C' value={f.tempC||''} onChange={e=>sf({...f,tempC:e.target.value})}/></div><button onClick={save}>Save Registration</button></section>}
function Triage({db,saveDb,setMsg,patientLookup}){const[f,sf]=useState({patientId:'',servicePlan:[]});const p=patientLookup(f.patientId);const save=()=>{if(!f.patientId)return;saveDb({...db,triage:{...db.triage,[f.patientId]:f}});setMsg('Triage saved');};return <section><h2>Screen 2</h2><Input label='Patient ID' value={f.patientId} onChange={e=>sf({...f,patientId:e.target.value})}/>{p&&<div>{p.firstName} {p.lastName}, {p.ageYears}</div>}<Input label='Chief complaint' value={f.chiefComplaint||''} onChange={e=>sf({...f,chiefComplaint:e.target.value})}/><Input label='Allergies' value={f.allergies||''} onChange={e=>sf({...f,allergies:e.target.value})}/><button onClick={save}>Save Triage</button></section>}
function Labs({db,saveDb,setMsg,today}){const[f,sf]=useState({patientId:'',date:today});const save=()=>{if(!f.patientId)return;saveDb({...db,labs:{...db.labs,[f.patientId]:f}});setMsg('Labs saved')};return <section><h2>Screen 3</h2><Input label='Patient ID' value={f.patientId} onChange={e=>sf({...f,patientId:e.target.value})}/><label><input type='checkbox' checked={!!f.randomGlucoseOrdered} onChange={e=>sf({...f,randomGlucoseOrdered:e.target.checked})}/>Random glucose ordered</label><Input label='Random glucose result' value={f.randomGlucoseResult||''} onChange={e=>sf({...f,randomGlucoseResult:e.target.value})}/><button onClick={save}>Save Labs</button></section>}
function Provider({db,saveDb,setMsg}){const[f,sf]=useState({noteType:'Consult Note',patientId:'',diagnoses:[]});const save=()=>{if(!f.patientId)return;saveDb({...db,notes:{...db.notes,[f.patientId]:f}});setMsg('Provider note saved')};return <section><h2>Screen 4</h2><label>Note Type<select value={f.noteType} onChange={e=>sf({...f,noteType:e.target.value})}>{['Consult Note','Minor Surgery Note','Dental Extraction Note','Circumcision Note'].map(n=><option key={n}>{n}</option>)}</select></label><Input label='Patient ID' value={f.patientId} onChange={e=>sf({...f,patientId:e.target.value})}/>{f.noteType==='Consult Note'&&<><Input label='Notes / plan of care' value={f.plan||''} onChange={e=>sf({...f,plan:e.target.value})}/></>}<button onClick={save}>Save Provider Note</button></section>}
function Prescriptions({db,saveDb,setMsg,medicationOptions}){const[f,sf]=useState({patientId:'',medicationId:'',status:'Ordered',quantityOrdered:''});const med=db.medicationCatalog.find(m=>m.id===Number(f.medicationId));const save=()=>{if(!f.patientId||!med)return;saveDb({...db,prescriptions:[...db.prescriptions,{...f,medicationName:med.name,strength:med.strength,form:med.form,usualDispense:med.usualDispense,bin:med.bin,date:new Date().toISOString().slice(0,10)}]});setMsg('Prescription saved to pharmacy queue')};return <section><h2>Screen 5</h2><Input label='Patient ID' value={f.patientId} onChange={e=>sf({...f,patientId:e.target.value})}/><label>Medication<select value={f.medicationId} onChange={e=>sf({...f,medicationId:e.target.value})}><option value=''>Select</option>{medicationOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>{med&&<div className='card'><b>Find in bin:</b> {med.bin}</div>}<Input label='Quantity ordered' value={f.quantityOrdered} onChange={e=>sf({...f,quantityOrdered:e.target.value})}/><button onClick={save}>Save Prescription</button></section>}
function Pharmacy({db,saveDb,setMsg,today}){const [pid,setPid]=useState('');const [qty,setQty]=useState('');const queue=db.prescriptions.filter(r=>['Ordered','Packing','Partial Fill','Out of Stock'].includes(r.status)&&(!pid||r.patientId===pid));const updateStatus=(idx,status)=>{const rec=db.prescriptions[idx];if(['Dispensed','Partial Fill'].includes(status)&&!qty){setMsg('Enter quantity dispensed first');return;}const next=[...db.prescriptions];next[idx]={...rec,status,quantityDispensed:qty||rec.quantityDispensed,dispenseTime:new Date().toISOString()};let meds=[...db.medicationCatalog];if(['Dispensed','Partial Fill'].includes(status)){const mid=Number(rec.medicationId);meds=meds.map(m=>m.id===mid?{...m,quantityOnHand:m.quantityOnHand-Number(qty)}:m);}saveDb({...db,prescriptions:next,medicationCatalog:meds});setMsg(`Updated ${rec.patientId} to ${status}`)};return <section><h2>Screen 6</h2><Input label='Search Patient ID' value={pid} onChange={e=>setPid(e.target.value)}/><Input label='Quantity dispensed' value={qty} onChange={e=>setQty(e.target.value)}/>{queue.map((r,i)=><div className='card' key={i}><div><b>{r.patientId}</b> {r.medicationName} {r.strength} {r.form} Qty:{r.quantityOrdered}</div><div><b>Find in bin:</b> {r.bin}</div><button onClick={()=>updateStatus(i,'Packing')}>Start Packing</button><button onClick={()=>updateStatus(i,'Dispensed')}>Dispensed</button><button onClick={()=>updateStatus(i,'Partial Fill')}>Partial Fill</button><button onClick={()=>updateStatus(i,'Out of Stock')}>Out of Stock</button><button onClick={()=>updateStatus(i,'Canceled')}>Canceled</button></div>)}</section>}
function Admin({db,dailySummary}){const exportCSV=(name,rows)=>{const keys=Object.keys(rows[0]||{});const csv=[keys.join(','),...rows.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();};return <section><h2>Admin / Pharmacy Menu</h2><h3>Medication Catalog</h3>{db.medicationCatalog.map(m=><div key={m.id}>{m.name} {m.strength} - {m.bin} - On hand: {m.quantityOnHand}</div>)}<h3>Daily Summary ({new Date().toISOString().slice(0,10)})</h3><pre>{JSON.stringify(dailySummary,null,2)}</pre><button onClick={()=>exportCSV('patients.csv',Object.values(db.patients))}>Export Patient Registration</button><button onClick={()=>exportCSV('prescriptions.csv',db.prescriptions)}>Export Prescriptions</button></section>}

createRoot(document.getElementById('root')).render(<App />);
