insert into public.kb_documents (title, source, content, tags)
values
  (
    'Chest pain safety basics',
    'VitaScan educational KB',
    'Chest pain can have many causes, including muscle strain, reflux, anxiety, lung problems, or heart-related problems. Chest pain that is severe, crushing, occurs with shortness of breath, sweating, fainting, nausea, or pain spreading to the arm, jaw, back, or shoulder should be treated as urgent. Seek emergency care immediately for concerning or sudden chest pain.',
    array['chest pain', 'emergency', 'triage']
  ),
  (
    'Shortness of breath warning signs',
    'VitaScan educational KB',
    'Shortness of breath may occur with asthma, infection, anxiety, heart or lung conditions, allergic reactions, or other causes. Emergency care is important if breathing trouble is severe, sudden, worsening, occurs at rest, includes blue lips, chest pain, confusion, fainting, or inability to speak full sentences.',
    array['shortness of breath', 'breathing', 'emergency']
  ),
  (
    'Stroke warning signs',
    'VitaScan educational KB',
    'Possible stroke warning signs include face drooping, arm weakness, speech difficulty, sudden confusion, sudden vision changes, severe dizziness, trouble walking, or sudden severe headache. These symptoms are time-sensitive. Call local emergency services immediately if stroke symptoms are present.',
    array['stroke', 'neurologic', 'emergency']
  ),
  (
    'Severe abdominal pain',
    'VitaScan educational KB',
    'Abdominal pain can come from digestion, infection, inflammation, urinary issues, reproductive organs, or other causes. Severe, sudden, worsening, or localized abdominal pain needs prompt medical attention, especially with fever, persistent vomiting, fainting, black or bloody stool, pregnancy, chest pain, or a rigid abdomen.',
    array['abdominal pain', 'stomach pain', 'urgent care']
  ),
  (
    'Fever self-care and escalation',
    'VitaScan educational KB',
    'Fever is commonly related to infection or inflammation. Track temperature, hydration, symptoms, duration, and exposures. Seek medical care for persistent fever, fever with stiff neck, confusion, trouble breathing, rash that does not blanch, dehydration, severe weakness, immune suppression, or symptoms that are worsening.',
    array['fever', 'infection', 'triage']
  ),
  (
    'Headache warning signs',
    'VitaScan educational KB',
    'Headaches are common and may be related to tension, dehydration, migraine, illness, or other causes. Emergency evaluation is important for sudden worst headache, headache with weakness or numbness, confusion, fainting, seizure, fever with stiff neck, vision loss, recent head injury, or a new severe headache during pregnancy.',
    array['headache', 'neurologic', 'emergency']
  ),
  (
    'Dehydration signs',
    'VitaScan educational KB',
    'Dehydration can happen with vomiting, diarrhea, fever, sweating, poor intake, or heat exposure. Concerning signs include very little urination, dizziness or fainting, confusion, rapid heartbeat, dry mouth, inability to keep fluids down, or severe weakness. Seek urgent care if dehydration is moderate or worsening.',
    array['dehydration', 'vomiting', 'diarrhea']
  ),
  (
    'Allergic reaction escalation',
    'VitaScan educational KB',
    'Allergic reactions can range from mild itching or rash to life-threatening anaphylaxis. Seek emergency care immediately for trouble breathing, throat or tongue swelling, wheezing, fainting, confusion, widespread hives with vomiting, or symptoms after a known severe allergen exposure.',
    array['allergic reaction', 'anaphylaxis', 'emergency']
  ),
  (
    'Dizziness and fainting',
    'VitaScan educational KB',
    'Dizziness can be related to dehydration, inner ear problems, low blood pressure, infection, medication effects, heart rhythm issues, or neurologic problems. Seek urgent or emergency care for dizziness with chest pain, shortness of breath, fainting, severe headache, weakness, numbness, trouble speaking, or persistent vomiting.',
    array['dizziness', 'fainting', 'triage']
  ),
  (
    'When to seek emergency care',
    'VitaScan educational KB',
    'Emergency care is appropriate for symptoms that are severe, sudden, rapidly worsening, or potentially life-threatening. Examples include chest pain with concerning features, severe breathing trouble, stroke symptoms, severe allergic reaction, severe bleeding, fainting with injury, sudden severe pain, confusion, or symptoms after major trauma.',
    array['emergency', 'red flags', 'triage']
  ),
  (
    'Persistent or worsening symptoms',
    'VitaScan educational KB',
    'Symptoms that persist, worsen, interfere with normal activities, or do not match the expected course should be discussed with a licensed clinician. Keep notes about onset, triggers, severity, associated symptoms, relevant health history, and what makes symptoms better or worse.',
    array['primary care', 'follow up', 'triage']
  ),
  (
    'Preparing for medical care',
    'VitaScan educational KB',
    'Before a medical visit, write down when symptoms started, where they are located, severity, changes over time, related symptoms, exposures, medical conditions, allergies, medications, and questions. Bring recent measurements or photos if relevant. This information can help clinicians evaluate symptoms more efficiently.',
    array['doctor visit', 'preparation', 'education']
  )
on conflict do nothing;
