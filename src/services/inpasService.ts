
import { InpasCitizen, InpasVehicle, InpasWeapon } from '../../types';
import { db, dbCollections, getDocs, query, where, doc, updateDoc } from '../../firebase';

// This can be toggled via environment variable in a real app
const USE_MOCK_DATA = false;

export const inpasService = {
  // Citizen Queries
  async searchCitizens(searchTerm: string): Promise<InpasCitizen[]> {
    if (USE_MOCK_DATA) {
      const { MOCK_CITIZENS } = await import('./inpasMockData');
      const q = searchTerm.toLowerCase();
      return MOCK_CITIZENS.filter(c => 
        c.firstName.toLowerCase().includes(q) || 
        c.lastName.toLowerCase().includes(q) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      );
    }
    
    const snap = await getDocs(dbCollections.inpas_citizens);
    const all = snap.docs.map(d => d.data() as InpasCitizen);
    const q = searchTerm.toLowerCase();
    console.log(`Searching citizens for "${q}" in ${all.length} records`);
    return all.filter(c => 
      (c.firstName?.toLowerCase() || '').includes(q) || 
      (c.lastName?.toLowerCase() || '').includes(q) ||
      (`${c.firstName || ''} ${c.lastName || ''}`.toLowerCase()).includes(q)
    );
  },

  async getCitizenById(id: string): Promise<InpasCitizen | null> {
    if (USE_MOCK_DATA) {
      const { MOCK_CITIZENS } = await import('./inpasMockData');
      return MOCK_CITIZENS.find(c => c.id === id) || null;
    }
    const snap = await getDocs(query(dbCollections.inpas_citizens, where("id", "==", id)));
    return snap.empty ? null : snap.docs[0].data() as InpasCitizen;
  },

  // Vehicle Queries
  async searchVehicles(searchTerm: string): Promise<InpasVehicle[]> {
    if (USE_MOCK_DATA) {
      const { MOCK_VEHICLES } = await import('./inpasMockData');
      const q = searchTerm.toLowerCase();
      return MOCK_VEHICLES.filter(v => 
        (v.plate?.toLowerCase() || '').includes(q) || 
        (v.ownerName?.toLowerCase() || '').includes(q) ||
        (v.type?.toLowerCase() || '').includes(q)
      );
    }
    const snap = await getDocs(dbCollections.inpas_vehicles);
    const all = snap.docs.map(d => d.data() as InpasVehicle);
    const q = searchTerm.toLowerCase();
    console.log(`Searching vehicles for "${q}" in ${all.length} records`);
    return all.filter(v => 
      (v.plate?.toLowerCase() || '').includes(q) || 
      (v.ownerName?.toLowerCase() || '').includes(q) ||
      (v.type?.toLowerCase() || '').includes(q)
    );
  },

  async getVehicleById(id: string): Promise<InpasVehicle | null> {
    if (USE_MOCK_DATA) {
      const { MOCK_VEHICLES } = await import('./inpasMockData');
      return MOCK_VEHICLES.find(v => v.id === id) || null;
    }
    const snap = await getDocs(query(dbCollections.inpas_vehicles, where("id", "==", id)));
    return snap.empty ? null : snap.docs[0].data() as InpasVehicle;
  },

  // Weapon Queries
  async searchWeapons(searchTerm: string): Promise<InpasWeapon[]> {
    if (USE_MOCK_DATA) {
      const { MOCK_WEAPONS } = await import('./inpasMockData');
      const q = searchTerm.toLowerCase();
      return MOCK_WEAPONS.filter(w => 
        (w.serialNumber?.toLowerCase() || '').includes(q) || 
        (w.ownerName?.toLowerCase() || '').includes(q)
      );
    }
    const snap = await getDocs(dbCollections.inpas_weapons);
    const all = snap.docs.map(d => d.data() as InpasWeapon);
    const q = searchTerm.toLowerCase();
    console.log(`Searching weapons for "${q}" in ${all.length} records`);
    return all.filter(w => 
      (w.serialNumber?.toLowerCase() || '').includes(q) || 
      (w.ownerName?.toLowerCase() || '').includes(q)
    );
  },

  async getWeaponById(id: string): Promise<InpasWeapon | null> {
    if (USE_MOCK_DATA) {
      const { MOCK_WEAPONS } = await import('./inpasMockData');
      return MOCK_WEAPONS.find(w => w.id === id) || null;
    }
    const snap = await getDocs(query(dbCollections.inpas_weapons, where("id", "==", id)));
    return snap.empty ? null : snap.docs[0].data() as InpasWeapon;
  },

  async addCriminalRecord(citizenId: string, record: string, type: 'criminalRecord' | 'openCases' = 'criminalRecord'): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log(`MOCK: Added ${type} to citizen ${citizenId}: ${record}`);
      return;
    }
    const citizenRef = doc(db, "inpas_citizens", citizenId);
    const snap = await getDocs(query(dbCollections.inpas_citizens, where("id", "==", citizenId)));
    if (snap.empty) return;
    
    const citizenData = snap.docs[0].data() as InpasCitizen;
    const currentRecords = citizenData[type] || [];
    
    await updateDoc(snap.docs[0].ref, {
      [type]: [...currentRecords, record]
    });
  }
};
