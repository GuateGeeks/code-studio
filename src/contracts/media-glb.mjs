import {sanitizePngContainer} from './media-png.mjs';

export const glbLimits = Object.freeze({bytes:524288,jsonBytes:131072,nodes:32,depth:8,primitives:64,
  vertices:20000,indices:60000,images:8,imagePixels:4194304,accessors:256,bufferViews:256});
const fail=message=>{throw new Error('GLB: '+message);};
const own=(value,key)=>Object.hasOwn(value,key);
function object(value,required=[],optional=[]) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key))||required.some(key=>!own(value,key)))fail('propiedades no soportadas');
  return value;
}
function list(value,max,min=0){if(!Array.isArray(value)||value.length<min||value.length>max||Object.keys(value).length!==value.length)fail('lista fuera de límites');return value;}
function integer(value,min,max){if(!Number.isSafeInteger(value)||value<min||value>max)fail('entero fuera de límites');return value;}
function number(value,min=-10000,max=10000){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail('número no finito o fuera de límites');return value;}
function vector(value,count,min=-10000,max=10000){list(value,count,count).forEach(item=>number(item,min,max));return value;}
function label(value){if(typeof value!=='string'||!value.length||value.length>128||/[\u0000-\u001f\u007f]/.test(value))fail('nombre inválido');}
function optionalName(value){if(own(value,'name'))label(value.name);}
const widths={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const readers={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'};

// Closed static glTF 2.0 subset. Image bytes are container-checked here; the
// isolated asset target must additionally inflate/decode every returned PNG.
export function inspectGlb(input) {
  const source=input instanceof Uint8Array?input:input instanceof ArrayBuffer?new Uint8Array(input):null;
  if(!source||source.length<28||source.length>glbLimits.bytes)fail('tamaño inválido o excede 512 KiB');
  const bytes=Uint8Array.from(source),data=new DataView(bytes.buffer);
  if(data.getUint32(0,true)!==0x46546c67||data.getUint32(4,true)!==2||data.getUint32(8,true)!==bytes.length)fail('cabecera GLB 2.0 inválida');
  const jsonLength=data.getUint32(12,true),binHeader=20+jsonLength;
  if(!jsonLength||jsonLength>glbLimits.jsonBytes||jsonLength%4||data.getUint32(16,true)!==0x4e4f534a||binHeader+8>bytes.length)fail('chunk JSON inválido');
  const binLength=data.getUint32(binHeader,true),binStart=binHeader+8;
  if(!binLength||binLength%4||data.getUint32(binHeader+4,true)!==0x004e4942||binStart+binLength!==bytes.length)fail('chunk BIN inválido o datos adicionales');
  let document;
  try{document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(20,binHeader)));}catch{fail('JSON UTF-8 inválido');}
  object(document,['asset','buffers','bufferViews','accessors','meshes','nodes','scenes'],['scene','materials','textures','samplers','images']);
  object(document.asset,['version'],['generator','copyright','minVersion']);
  if(document.asset.version!=='2.0'||(own(document.asset,'minVersion')&&document.asset.minVersion!=='2.0'))fail('versión glTF no soportada');
  for(const key of ['generator','copyright'])if(own(document.asset,key))label(document.asset[key]);
  list(document.buffers,1,1);object(document.buffers[0],['byteLength']);
  const bufferLength=integer(document.buffers[0].byteLength,1,binLength);
  if(binLength-bufferLength>3||bytes.subarray(binStart+bufferLength).some(byte=>byte!==0))fail('padding BIN inválido');
  const views=list(document.bufferViews,glbLimits.bufferViews,1).map(view=>{
    object(view,['buffer','byteLength'],['byteOffset','byteStride','target','name']);optionalName(view);
    if(view.buffer!==0)fail('buffer externo no permitido');
    const offset=integer(view.byteOffset??0,0,bufferLength),length=integer(view.byteLength,1,bufferLength);
    if(offset%4||offset+length>bufferLength)fail('rango o alineación de bufferView inválido');
    if(own(view,'byteStride')&&(integer(view.byteStride,4,252)%4))fail('stride no alineado');
    if(own(view,'target')&&![34962,34963].includes(view.target))fail('target bufferView no soportado');
    return {offset,length,stride:view.byteStride,target:view.target};
  });
  let scalarCount=0;
  const accessors=list(document.accessors,glbLimits.accessors,1).map(accessor=>{
    object(accessor,['bufferView','componentType','count','type'],['byteOffset','normalized','min','max','name']);optionalName(accessor);
    const view=views[integer(accessor.bufferView,0,views.length-1)],width=widths[accessor.componentType],count=integer(accessor.count,1,glbLimits.indices),size=components[accessor.type];
    if(!width||!size||(own(accessor,'normalized')&&typeof accessor.normalized!=='boolean')||(accessor.normalized&&![5120,5121,5122,5123].includes(accessor.componentType)))fail('accessor no soportado');
    const offset=integer(accessor.byteOffset??0,0,view.length),stride=view.stride??width*size;
    if(offset%width||(view.offset+offset)%width||stride<width*size||offset+(count-1)*stride+width*size>view.length)fail('rango/alineación de accessor inválido');
    scalarCount+=count*size;if(scalarCount>240000)fail('cuota agregada de accessors');
    const minima=Array(size).fill(Infinity),maxima=Array(size).fill(-Infinity),values=[];
    for(let index=0;index<count;index++)for(let component=0;component<size;component++){
      const value=data[readers[accessor.componentType]](binStart+view.offset+offset+index*stride+component*width,true);
      number(value,accessor.componentType===5126?-10000:-2147483648,accessor.componentType===5126?10000:4294967295);
      minima[component]=Math.min(minima[component],value);maxima[component]=Math.max(maxima[component],value);values.push(value);
    }
    for(const [key,actual]of [['min',minima],['max',maxima]])if(own(accessor,key)){
      vector(accessor[key],size,-2147483648,4294967295);
      if(accessor[key].some((value,index)=>Math.abs(value-actual[index])>1e-6*Math.max(1,Math.abs(actual[index]))))fail('bounds del accessor no coinciden con BIN');
    }
    return {view,width,size,count,offset,stride,values,componentType:accessor.componentType,type:accessor.type,normalized:accessor.normalized===true};
  });
  const images=list(document.images??[],glbLimits.images).map(image=>{
    object(image,['bufferView','mimeType'],['name']);optionalName(image);
    if(image.mimeType!=='image/png')fail('solo PNG embebido, sin URI');
    const view=views[integer(image.bufferView,0,views.length-1)];if(view.stride||view.target)fail('bufferView de imagen inválido');
    const original=bytes.subarray(binStart+view.offset,binStart+view.offset+view.length),sanitized=sanitizePngContainer(original);
    // The loader receives this GLB's original BIN, so metadata cannot merely be
    // stripped in a side result while reaching the native decoder unchanged.
    if(sanitized.bytes.length!==original.length||sanitized.bytes.some((byte,index)=>byte!==original[index]))fail('metadatos PNG embebidos no soportados');
    return sanitized;
  });
  const imagePixels=images.reduce((sum,image)=>sum+image.width*image.height,0);
  if(imagePixels>glbLimits.imagePixels)fail('cuota de imágenes embebidas');
  const samplers=list(document.samplers??[],16);
  for(const sampler of samplers){object(sampler,[],['magFilter','minFilter','wrapS','wrapT','name']);optionalName(sampler);
    if(own(sampler,'magFilter')&&![9728,9729].includes(sampler.magFilter)||own(sampler,'minFilter')&&![9728,9729,9984,9985,9986,9987].includes(sampler.minFilter))fail('filtro no soportado');
    for(const key of ['wrapS','wrapT'])if(own(sampler,key)&&![33071,33648,10497].includes(sampler[key]))fail('wrap no soportado');
  }
  const textures=list(document.textures??[],16);
  for(const texture of textures){object(texture,['source'],['sampler','name']);optionalName(texture);integer(texture.source,0,images.length-1);if(own(texture,'sampler'))integer(texture.sampler,0,samplers.length-1);}
  function textureInfo(value,extra){object(value,['index'],['texCoord',...extra]);integer(value.index,0,textures.length-1);if(own(value,'texCoord')&&value.texCoord!==0)fail('solo TEXCOORD_0');}
  const materials=list(document.materials??[],64);
  for(const material of materials){
    object(material,[],['name','pbrMetallicRoughness','normalTexture','occlusionTexture','emissiveTexture','emissiveFactor','alphaMode','alphaCutoff','doubleSided']);optionalName(material);
    if(own(material,'pbrMetallicRoughness')){
      const pbr=object(material.pbrMetallicRoughness,[],['baseColorFactor','baseColorTexture','metallicFactor','roughnessFactor','metallicRoughnessTexture']);
      if(own(pbr,'baseColorFactor'))vector(pbr.baseColorFactor,4,0,1);
      for(const key of ['metallicFactor','roughnessFactor'])if(own(pbr,key))number(pbr[key],0,1);
      for(const key of ['baseColorTexture','metallicRoughnessTexture'])if(own(pbr,key))textureInfo(pbr[key],[]);
    }
    if(own(material,'normalTexture')){textureInfo(material.normalTexture,['scale']);if(own(material.normalTexture,'scale'))number(material.normalTexture.scale,0,10);}
    if(own(material,'occlusionTexture')){textureInfo(material.occlusionTexture,['strength']);if(own(material.occlusionTexture,'strength'))number(material.occlusionTexture.strength,0,1);}
    if(own(material,'emissiveTexture'))textureInfo(material.emissiveTexture,[]);
    if(own(material,'emissiveFactor'))vector(material.emissiveFactor,3,0,1);
    if(own(material,'alphaMode')&&!['OPAQUE','MASK','BLEND'].includes(material.alphaMode))fail('alphaMode inválido');
    if(own(material,'alphaCutoff'))number(material.alphaCutoff,0,1);
    if(own(material,'doubleSided')&&typeof material.doubleSided!=='boolean')fail('doubleSided inválido');
  }
  let primitives=0,vertices=0,indices=0;
  const meshes=list(document.meshes,32,1);
  for(const mesh of meshes){object(mesh,['primitives'],['name']);optionalName(mesh);
    for(const primitive of list(mesh.primitives,glbLimits.primitives,1)){
      if(++primitives>glbLimits.primitives)fail('cuota de primitivas');
      object(primitive,['attributes'],['indices','material','mode']);
      if(own(primitive,'mode')&&primitive.mode!==4)fail('solo TRIANGLES');
      const attributes=object(primitive.attributes,['POSITION'],['NORMAL','TANGENT','TEXCOORD_0','COLOR_0']);
      const position=accessors[integer(attributes.POSITION,0,accessors.length-1)];
      if(position.componentType!==5126||position.type!=='VEC3'||position.normalized||!own(document.accessors[attributes.POSITION],'min')||!own(document.accessors[attributes.POSITION],'max'))fail('POSITION Float32 VEC3 con bounds requerido');
      vertices+=position.count;if(vertices>glbLimits.vertices)fail('cuota de vértices');
      for(const [semantic,accessorIndex]of Object.entries(attributes)){
        const accessor=accessors[integer(accessorIndex,0,accessors.length-1)];
        if(accessor.count!==position.count||(accessor.view.offset+accessor.offset)%4||accessor.view.target===34963)fail('atributos incompatibles o no alineados');
        if(semantic==='NORMAL'&&(accessor.type!=='VEC3'||accessor.componentType!==5126||accessor.normalized))fail('NORMAL inválido');
        if(semantic==='TANGENT'&&(accessor.type!=='VEC4'||accessor.componentType!==5126||accessor.normalized))fail('TANGENT inválido');
        if(semantic==='TEXCOORD_0'&&(accessor.type!=='VEC2'||!(accessor.componentType===5126&&!accessor.normalized||[5121,5123].includes(accessor.componentType)&&accessor.normalized)))fail('TEXCOORD_0 inválido');
        if(semantic==='COLOR_0'&&(!['VEC3','VEC4'].includes(accessor.type)||!(accessor.componentType===5126&&!accessor.normalized||[5121,5123].includes(accessor.componentType)&&accessor.normalized)))fail('COLOR_0 inválido');
        if(semantic==='COLOR_0'&&accessor.componentType===5126&&accessor.values.some(value=>value<0||value>1))fail('color fuera de rango');
      }
      let count=position.count;
      if(own(primitive,'indices')){
        const accessor=accessors[integer(primitive.indices,0,accessors.length-1)];
        if(accessor.type!=='SCALAR'||![5121,5123,5125].includes(accessor.componentType)||accessor.normalized||accessor.view.stride||accessor.view.target===34962||accessor.values.some(index=>index>=position.count))fail('índice de vértice inválido');
        count=accessor.count;
      }
      if(count%3)fail('triángulos incompletos');indices+=count;if(indices>glbLimits.indices)fail('cuota de índices');
      if(own(primitive,'material'))integer(primitive.material,0,materials.length-1);
    }
  }
  const nodes=list(document.nodes,glbLimits.nodes,1),parents=new Map();
  nodes.forEach((node,index)=>{
    object(node,[],['name','mesh','children','matrix','translation','rotation','scale']);optionalName(node);
    if(own(node,'mesh'))integer(node.mesh,0,meshes.length-1);
    if(own(node,'matrix')){
      vector(node.matrix,16);if(['translation','rotation','scale'].some(key=>own(node,key))||[3,7,11].some(offset=>node.matrix[offset]!==0)||node.matrix[15]!==1)fail('matriz affine inválida');
      const m=node.matrix,det=m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);
      if(Math.abs(det)<1e-9)fail('matriz degenerada');
    }
    if(own(node,'translation'))vector(node.translation,3);
    if(own(node,'rotation')){vector(node.rotation,4,-1,1);if(Math.abs(node.rotation.reduce((sum,value)=>sum+value*value,0)-1)>1e-4)fail('quaternion no unitario');}
    if(own(node,'scale')){vector(node.scale,3,-1000,1000);if(node.scale.some(value=>Math.abs(value)<0.001))fail('escala degenerada');}
    for(const child of list(node.children??[],glbLimits.nodes)){integer(child,0,nodes.length-1);if(child===index||parents.has(child))fail('parentesco duplicado');parents.set(child,index);}
  });
  nodes.forEach((_,index)=>{const seen=new Set();let cursor=index;while(cursor!==undefined){if(seen.has(cursor)||seen.size>=glbLimits.depth)fail('ciclo o profundidad de nodos');seen.add(cursor);cursor=parents.get(cursor);}});
  const scenes=list(document.scenes,8,1);
  for(const scene of scenes){object(scene,['nodes'],['name']);optionalName(scene);const seen=new Set();for(const index of list(scene.nodes,glbLimits.nodes,1)){integer(index,0,nodes.length-1);if(seen.has(index)||parents.has(index))fail('raíz de escena inválida');seen.add(index);}}
  if(own(document,'scene'))integer(document.scene,0,scenes.length-1);
  return {bytes,document,metadata:{nodes:nodes.length,primitives,vertices,indices,images:images.length,imagePixels},images};
}
