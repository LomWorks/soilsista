import { useState } from "react";
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = async () => {
    await addDoc(collection(db, "contactMessages"), form);
    alert("Message sent");
  };

  return (
    <div style={styles.page}>
      <h1>Contact</h1>
      <input placeholder="Name" onChange={e=>setForm({...form,name:e.target.value})}/>
      <input placeholder="Email" onChange={e=>setForm({...form,email:e.target.value})}/>
      <textarea placeholder="Message" onChange={e=>setForm({...form,message:e.target.value})}/>
      <button onClick={submit}>Send</button>
    </div>
  );
}

const styles = {
  page: { padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }
};
