import { FoodExample } from "@/types/nutrition";

// Sumber protein murah & umum di Indonesia untuk pencatatan cepat.
// Makro per porsi (estimasi TKPI/USDA) — protein, karbo, dan lemak harus terisi
// wajar; jangan pernah 0 semua selain memang nol (mis. dada ayam tanpa karbo).
export const FOOD_EXAMPLES: FoodExample[] = [
  // Telur & unggas
  { name: "Telur rebus", protein_g: 6.3, carb_g: 0.6, fat_g: 5.3, calories: 78, portion: "1 butir" },
  { name: "Telur dadar", protein_g: 6.5, carb_g: 0.7, fat_g: 9.8, calories: 118, portion: "1 butir + minyak" },
  { name: "Putih telur", protein_g: 10.9, carb_g: 0.7, fat_g: 0.2, calories: 52, portion: "3 butir" },
  { name: "Telur puyuh", protein_g: 5.9, carb_g: 0.2, fat_g: 5, calories: 71, portion: "5 butir" },
  { name: "Telur asin", protein_g: 9, carb_g: 1.4, fat_g: 9.5, calories: 137, portion: "1 butir" },
  { name: "Dada ayam tanpa kulit", protein_g: 31, carb_g: 0, fat_g: 3.6, calories: 165, portion: "100 g" },
  { name: "Paha ayam tanpa kulit", protein_g: 26, carb_g: 0, fat_g: 10.9, calories: 209, portion: "100 g" },
  { name: "Ayam goreng (dada)", protein_g: 27, carb_g: 6, fat_g: 15, calories: 260, portion: "1 potong" },
  { name: "Hati ayam", protein_g: 24.5, carb_g: 0.9, fat_g: 6.3, calories: 167, portion: "100 g" },
  // Ikan & seafood
  { name: "Ikan kembung", protein_g: 22, carb_g: 0, fat_g: 3.4, calories: 118, portion: "100 g" },
  { name: "Ikan lele", protein_g: 17, carb_g: 0, fat_g: 4.8, calories: 113, portion: "100 g" },
  { name: "Ikan tongkol", protein_g: 24, carb_g: 0, fat_g: 1, calories: 110, portion: "100 g" },
  { name: "Ikan nila", protein_g: 20.1, carb_g: 0, fat_g: 1.7, calories: 96, portion: "100 g" },
  { name: "Ikan mujair", protein_g: 18.7, carb_g: 0, fat_g: 1, calories: 84, portion: "100 g" },
  { name: "Ikan patin", protein_g: 17, carb_g: 1.1, fat_g: 6.6, calories: 132, portion: "100 g" },
  { name: "Ikan salmon", protein_g: 20, carb_g: 0, fat_g: 13, calories: 208, portion: "100 g" },
  { name: "Tuna kaleng (air)", protein_g: 24, carb_g: 0, fat_g: 1, calories: 108, portion: "100 g" },
  { name: "Sarden kaleng", protein_g: 18, carb_g: 1.4, fat_g: 9, calories: 160, portion: "100 g" },
  { name: "Ikan teri kering", protein_g: 8.3, carb_g: 0, fat_g: 0.8, calories: 47, portion: "25 g" },
  { name: "Udang", protein_g: 21, carb_g: 0.2, fat_g: 0.9, calories: 91, portion: "100 g" },
  { name: "Cumi-cumi", protein_g: 16, carb_g: 3.1, fat_g: 1.4, calories: 92, portion: "100 g" },
  // Daging
  { name: "Daging sapi tanpa lemak", protein_g: 26, carb_g: 0, fat_g: 11, calories: 205, portion: "100 g" },
  { name: "Daging kambing", protein_g: 25, carb_g: 0, fat_g: 9, calories: 185, portion: "100 g" },
  { name: "Bakso sapi", protein_g: 11, carb_g: 8, fat_g: 12, calories: 185, portion: "5 butir" },
  // Nabati
  { name: "Tempe", protein_g: 19, carb_g: 9, fat_g: 8.8, calories: 193, portion: "100 g" },
  { name: "Tahu", protein_g: 8, carb_g: 1.9, fat_g: 4.8, calories: 76, portion: "100 g" },
  { name: "Edamame", protein_g: 11, carb_g: 8.9, fat_g: 5.2, calories: 122, portion: "100 g" },
  { name: "Kacang tanah", protein_g: 26, carb_g: 16, fat_g: 49, calories: 567, portion: "100 g" },
  { name: "Kacang almond", protein_g: 6, carb_g: 6, fat_g: 15, calories: 173, portion: "30 g" },
  { name: "Kacang hijau rebus", protein_g: 7, carb_g: 19, fat_g: 0.4, calories: 105, portion: "100 g" },
  // Susu & olahan
  { name: "Susu UHT full cream", protein_g: 6.4, carb_g: 9.6, fat_g: 6.6, calories: 122, portion: "200 ml" },
  { name: "Susu low fat", protein_g: 7, carb_g: 10, fat_g: 2.4, calories: 90, portion: "200 ml" },
  { name: "Susu kedelai", protein_g: 6, carb_g: 8, fat_g: 3.6, calories: 90, portion: "200 ml" },
  { name: "Greek yogurt plain", protein_g: 10, carb_g: 3.6, fat_g: 0.4, calories: 59, portion: "100 g" },
  { name: "Keju cheddar", protein_g: 5, carb_g: 0.3, fat_g: 6.7, calories: 81, portion: "1 lembar (20 g)" },
  { name: "Whey protein", protein_g: 24, carb_g: 3, fat_g: 1.5, calories: 120, portion: "1 scoop (30 g)" },
];
