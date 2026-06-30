-- Seed data for public.menus (cafe & restaurant)
insert into public.menus (name, description, price, discount, image_url, category, is_available)
values
  -- Coffee
  ('Espresso', 'Single shot of rich, full-bodied espresso.', 18000, 0, null, 'Coffee', true),
  ('Americano', 'Espresso diluted with hot water for a smooth black coffee.', 22000, 0, null, 'Coffee', true),
  ('Cappuccino', 'Espresso with steamed milk and a thick layer of foam.', 28000, 0, null, 'Coffee', true),
  ('Caffe Latte', 'Espresso with steamed milk and a light layer of foam.', 30000, 10, null, 'Coffee', true),
  ('Cafe Mocha', 'Espresso with chocolate and steamed milk.', 32000, 0, null, 'Coffee', true),
  ('Caramel Macchiato', 'Vanilla milk marked with espresso and caramel drizzle.', 35000, 15, null, 'Coffee', true),
  ('Vietnam Drip', 'Strong robusta coffee dripped over sweetened condensed milk.', 26000, 0, null, 'Coffee', true),
  ('Cold Brew', 'Slow-steeped cold brew, smooth and low in acidity.', 30000, 0, null, 'Coffee', true),

  -- Non-Coffee
  ('Matcha Latte', 'Premium Japanese matcha with steamed milk.', 32000, 0, null, 'Non-Coffee', true),
  ('Chocolate', 'Rich hot or iced chocolate made with real cocoa.', 28000, 0, null, 'Non-Coffee', true),
  ('Red Velvet Latte', 'Creamy red velvet drink with a hint of cocoa.', 33000, 0, null, 'Non-Coffee', true),
  ('Taro Latte', 'Sweet and creamy taro milk drink.', 30000, 0, null, 'Non-Coffee', true),
  ('Lemon Tea', 'Refreshing black tea with fresh lemon.', 20000, 0, null, 'Non-Coffee', true),
  ('Thai Tea', 'Creamy Thai-style milk tea.', 25000, 0, null, 'Non-Coffee', true),

  -- Appetizer
  ('French Fries', 'Crispy golden fries served with mayo and ketchup.', 25000, 0, null, 'Appetizer', true),
  ('Chicken Wings', 'Six pieces of fried wings tossed in choice of sauce.', 38000, 0, null, 'Appetizer', true),
  ('Mozzarella Sticks', 'Breaded mozzarella sticks with marinara dip.', 35000, 0, null, 'Appetizer', true),
  ('Onion Rings', 'Crispy battered onion rings.', 28000, 0, null, 'Appetizer', true),
  ('Spring Rolls', 'Vegetable spring rolls served with sweet chili sauce.', 30000, 0, null, 'Appetizer', true),

  -- Main Course
  ('Nasi Goreng Spesial', 'Indonesian fried rice with chicken, egg, and prawn crackers.', 42000, 0, null, 'Main Course', true),
  ('Mie Goreng', 'Stir-fried noodles with vegetables and egg.', 38000, 0, null, 'Main Course', true),
  ('Ayam Bakar', 'Grilled chicken with sweet soy glaze, rice, and sambal.', 48000, 10, null, 'Main Course', true),
  ('Beef Steak', 'Grilled beef steak with mashed potato and mushroom sauce.', 85000, 0, null, 'Main Course', true),
  ('Chicken Steak', 'Grilled chicken steak with fries and BBQ sauce.', 55000, 0, null, 'Main Course', true),
  ('Spaghetti Bolognese', 'Spaghetti with rich beef tomato sauce.', 50000, 0, null, 'Main Course', true),
  ('Chicken Caesar Salad', 'Romaine, grilled chicken, croutons, and Caesar dressing.', 45000, 0, null, 'Main Course', true),
  ('Beef Burger', 'Beef patty with cheese, lettuce, tomato, and fries.', 52000, 15, null, 'Main Course', true),

  -- Dessert
  ('Cheesecake', 'New York-style cheesecake slice.', 35000, 0, null, 'Dessert', true),
  ('Chocolate Lava Cake', 'Warm chocolate cake with a molten center and ice cream.', 38000, 0, null, 'Dessert', true),
  ('Tiramisu', 'Classic Italian coffee-flavored dessert.', 36000, 0, null, 'Dessert', true),
  ('Pancake Stack', 'Fluffy pancakes with maple syrup and butter.', 32000, 0, null, 'Dessert', true),
  ('Ice Cream Sundae', 'Three scoops with toppings and chocolate sauce.', 30000, 0, null, 'Dessert', false);
