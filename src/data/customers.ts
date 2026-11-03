import type { CustomerDef } from '../core/types';

export interface CustomerArchetypeDef { key:string;name:string;templates:string[] }
export const CUSTOMER_ARCHETYPES:CustomerArchetypeDef[]=[
  {key:'regular',name:'Khách quen',templates:['order.red_small']},
  {key:'husband_gift',name:'Mua quà tặng vợ',templates:['order.burning','order.eternal']},
  {key:'tea_shop_owner',name:'Chủ quán trà',templates:['order.red_large']},
  {key:'bride_to_be',name:'Cô dâu tương lai',templates:['order.lavender']},
  {key:'proposer',name:'Sắp cầu hôn',templates:['order.hearts']},
  {key:'student',name:'Học sinh',templates:['order.red_small']},
  {key:'collector',name:'Nhà sưu tầm',templates:['order.rare_mix']},
  {key:'wedding_planner',name:'Người tổ chức tiệc cưới',templates:['order.eternal','order.lavender']},
  {key:'teacher',name:'Giáo viên',templates:['order.morning']},
  {key:'cafe_owner',name:'Chủ quán cà phê',templates:['order.monica']},
  {key:'long_distance',name:'Tình yêu xa',templates:['order.symphony']},
  {key:'designer',name:'Nhà thiết kế',templates:['order.monica']},
];

type RosterRow=[slug:string,name:string,archetypeKey:string,image:string,animatedImage?:string];
export const CUSTOMER_ROSTER:readonly RosterRow[]=[
  ['anh_khoa','Anh Khoa','proposer','customer/anh-khoa.png'],
  ['anh_nam','Anh Nam','regular','customer/anh-nam.png'],
  ['anh_quan','Anh Quân','long_distance','customer/anh-quan.png'],
  ['anh_tuan','Anh Tuấn','designer','customer/anh-tuan.png'],
  ['ba_huong','Bà Hương','tea_shop_owner','customer/ba-huong.png'],
  ['ba_lien','Bà Liên','wedding_planner','customer/ba-lien.png'],
  ['ba_oanh','Bà Oanh','collector','customer/ba-oanh.png'],
  ['ba_tam','Bà Tám','regular','customer/ba-tam.png','customer/ba-tam.gif'],
  ['be_an','Bé An','student','customer/be-an.png'],
  ['be_bao','Bé Bảo','student','customer/be-bao.png'],
  ['be_mi','Bé Mi','student','customer/be-mi.png'],
  ['chi_hanh','Chị Hạnh','bride_to_be','customer/chi-hanh.png'],
  ['chi_ly','Chị Ly','designer','customer/chi-ly.png'],
  ['chi_mai','Chị Mai','bride_to_be','customer/chi-mai.png'],
  ['chi_uyen','Chị Uyên','cafe_owner','customer/chi-uyen.png'],
  ['chu_binh','Chú Bình','husband_gift','customer/chu-binh.png'],
  ['chu_lam','Chú Lâm','tea_shop_owner','customer/chu-lam.png'],
  ['chu_minh','Chú Minh','husband_gift','customer/chu-minh.png'],
  ['chu_phuc','Chú Phúc','regular','customer/chu-phuc.png'],
  ['co_ha','Cô Hà','regular','customer/co-ha.png'],
  ['co_lan','Cô Lan','regular','customer/co-lan.png'],
  ['co_van','Cô Vân','cafe_owner','customer/co-van.png'],
  ['co_yen','Cô Yên','designer','customer/co-yen.png'],
  ['di_ngoc','Dì Ngọc','wedding_planner','customer/di-ngoc.png'],
  ['di_thao','Dì Thảo','tea_shop_owner','customer/di-thao.png'],
  ['di_tram','Dì Trâm','collector','customer/di-tram.png'],
  ['thay_dung','Thầy Dũng','teacher','customer/thay-dung.png'],
  ['thay_long','Thầy Long','teacher','customer/thay-long.png'],
  ['thay_son','Thầy Sơn','teacher','customer/thay-son.png'],
];

const closeOrders=new Set(['order.lavender','order.hearts','order.morning','order.symphony']);
export const CUSTOMERS:CustomerDef[]=CUSTOMER_ROSTER.map(([slug,name,archetypeKey,image,animatedImage])=>{
  const archetype=CUSTOMER_ARCHETYPES.find((item)=>item.key===archetypeKey)!;
  return {
    id:`customer.${slug}`,name,archetype:archetype.name,archetypeKey,tags:[slug,archetypeKey],preferences:[],
    orderTemplates:archetype.templates.map((templateId)=>({templateId,weight:1,minFavorLevel:closeOrders.has(templateId)?'close':'stranger'})),
    giftTable:[{minFavorLevel:'close',chance:.1,lootTableId:'gift_seed_2'},{minFavorLevel:'soulmate',chance:.03,lootTableId:'gift_seed_3'}],
    avatar:{image,...(animatedImage?{animatedImage}:{})},
  };
});

export const LEGACY_CUSTOMER_NAMES:Record<string,string>={
  'customer.regular':'Cô Lan','customer.husband_gift':'Chú Minh','customer.tea_shop_owner':'Bà Hương',
  'customer.bride_to_be':'Anh Nam','customer.proposer':'Chị Mai','customer.student':'Bé An',
  'customer.collector':'Thầy Dũng','customer.wedding_planner':'Dì Thảo','customer.teacher':'Cô Vân',
  'customer.cafe_owner':'Chú Bình','customer.long_distance':'Bà Liên','customer.designer':'Anh Khoa',
};

const warned=new Set<string>();
export function customerById(id:string):CustomerDef {
  const found=CUSTOMERS.find((customer)=>customer.id===id);if(found)return found;
  if(!warned.has(id)){warned.add(id);console.warn(`[Khách hàng không tồn tại] ${id}`);}
  const label=id.split('.').at(-1)?.replaceAll('_',' ')||id;
  return {id,name:label,archetype:'Khách cũ',archetypeKey:'regular',tags:[],preferences:[],orderTemplates:[],giftTable:[],avatar:{image:''}};
}
