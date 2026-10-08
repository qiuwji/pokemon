"""Separate cinematic textures/sprites. Affine BG sampling is compiled offline, never interpreted in-game."""
import re
from PIL import Image


def export_movie(art):
    base = 'graphics/intro/'
    for name in ['groudon','kyogre']:
        art.outputs[art.root / f'generated/assets/audio/cry-{name}.wav'] = art.read(f'sound/direct_sound_samples/cries/{name}.wav')
    art.read('src/scanline_effect.c')
    art.read('src/battle_anim_rock.c')
    for i in range(4):
        art.add(f'movie-leaf-{i}', art.tilemap(base+'scene_1/bg.png', base+f'scene_1/bg{i}_map.bin', art.palette(base+'scene_1/bg.png')))
    drops, logo = art.palette(base+'scene_1/drops.pal'), art.palette(base+'scene_1/logo.pal')
    for name, offsets, size, pal in [('drop', [0,16,24], (32,32), drops), ('ripple',[48],(64,32),drops),
                                    ('letter',[80,84,88,92,96,100,104],(16,16),logo), ('game-freak',[128],(32,64),logo)]:
        art.add('movie-'+name, art.sprite(base+'scene_1/drops_logo.png', offsets, size, pal))
    art.add('movie-flygon-silhouette', art.sprite(base+'scene_1/flygon.png',[0],(64,32)))
    art.add('movie-sparkle', art.sprite(base+'scene_1/sparkle.png', [0,4,8,12,16], (16,16), art.palette(base+'scene_3/lightning.png')))
    for name, offsets, size, pal in [('volbeat',[0,16],(32,32),None), ('torchic',[0,16,32,48,64,80],(32,32),None),
            ('manectric',[0,64,128,192],(64,64),None), ('brendan',[0,64,128,192],(64,64),art.palette(base+'scene_2/player.pal')),
            ('may',[0,64,128,192],(64,64),art.palette(base+'scene_2/player.pal')), ('bicycle',[0,32,64,96],(64,32),art.palette(base+'scene_2/player.pal')),
            ('flygon',[0,64],(64,64),None)]:
        art.add('movie-'+name, art.sprite(base+'scene_2/'+name+'.png',offsets,size,pal))
    colors = [(0,0,0)] * 256
    colors[:16] = art.palette(base+'scene_2/trees.png')[:16]
    colors[240:] = art.palette(base+'scene_2/grass.png')[:16]
    trees = art.tilemap(base+'scene_2/trees.png',base+'scene_2/trees_map.bin',colors,(256,512))
    art.add('movie-trees-far',trees.crop((0,0,256,256)))
    art.add('movie-trees-near',trees.crop((0,256,256,512)))
    art.add('movie-grass',art.tilemap(base+'scene_2/grass.png',base+'scene_2/grass_map.bin',colors))
    for i, offset, size in [(0,0,(32,32)),(1,16,(16,32)),(2,24,(16,32))]:
        art.add('movie-small-tree-'+str(i),art.sprite(base+'scene_2/trees_small.png',[offset],size))
    pal = art.palette(base+'scene_3/bg.pal')
    for name, size in [('clouds-left',(512,256)),('clouds-right',(512,256)),('clouds-sun',(256,256))]:
        texture=art.tilemap(base+'scene_3/clouds.png',base+'scene_3/'+name.replace('-','_')+'.bin',pal,size)
        for i in range(size[0]//256): art.add('movie-'+name+str(i),texture.crop((i*256,0,i*256+256,256)))
    for name in ['rayquaza', 'rayquaza_clouds']:
        art.add('movie-'+name,art.tilemap(base+'scene_3/'+name+'.png',base+'scene_3/'+name+'.bin',pal,
                tail=base+'scene_3/kyogre.png' if name=='rayquaza_clouds' else None))
    art.add('movie-pokeball',art.tilemap(base+'scene_3/pokeball.png',base+'scene_3/pokeball_map.bin',art.palette(base+'scene_3/pokeball.png'),affine=True))
    for name, offsets, size, palette in [('lightning',[0,16,32,48,64,80],(32,32),None),('bubbles',[0,8,16,24,32],(16,32),None),
                                       ('orb',[16],(64,64),art.palette(base+'scene_3/rayquaza_orb.pal'))]:
        art.add('movie-'+name,art.sprite(base+'scene_3/'+('misc' if name=='orb' else name)+'.png',offsets,size,palette))
    art.add('movie-rocks',art.sprite('graphics/battle_anims/sprites/rocks.png',[0,16,32,48],(32,32)))
    # The BG hardware reads the first 4096 map bytes at AFF512x512. Extra source bytes remain documented inputs.
    sine = [round(float(v)*256) for v in re.findall(r'Q_8_8\(([-\d.]+)\)',art.read('src/trig.c').decode().split('const s16 gSineTable[]')[1].split('};')[0])]
    sin = lambda index, amplitude: (sine[index & 255] * amplitude) >> 8
    # Background wave runs at one scanline per two frames, over a 64-line period.
    for name in ['groudon','kyogre']:
        background=art.tilemap(base+'scene_3/legend_bg.png',base+f'scene_3/{name}_bg.bin',pal)
        pixels=background.load(); sheet=Image.new('RGBA',(256,64*256))
        for phase in range(64):
            image=Image.new('RGBA',(256,256))
            image.putdata([pixels[(x+int(sine[((y+phase)*4)&255]*4/256))&255,y] if name=='groudon'
                           else pixels[x,(y+int(sine[((y+phase)*4)&255]*4/256))&255] for y in range(256) for x in range(256)])
            sheet.paste(image,(0,phase*256))
        art.add(f'movie-{name}-wave',sheet)
    curves = {}
    for name, length in [('groudon',151),('kyogre',278)]:
        # Encode palette indices first so highlights replace only their exact native index.
        texture=art.tilemap(base+'scene_3/'+name+'.png',base+'scene_3/'+name+'.bin',[(i,i,i) for i in range(256)],(512,512),affine=True)
        frames=[]; params=[]
        for frame in range(length):
            x,y,z,fade = -96,-175,256,0
            if name=='groudon':
                a=frame-10
                if a>=0: x=-96+min(a,16)*16
                if a>=48: x,y=-96,169
                if a>=51: x,y=80,41
                if a>=67:
                    t=min(a-67,10); x,y=80+4*t,40+4*t
                    z=256+sin((t*0x666)>>8,64)
                if a>=77: x,y,z,fade=120,80,max(0,256-(a-77)*8),min(16,(a-76)//4)
                if 16<=a<77: y+=3 if (a//2)&1 else 0
                params.append({'clip':min(32,(frame+1)*4),'fadeIn':max(0,16-frame),'fadeOut':fade})
            else:
                x,y=336,80
                if frame>=15: angle=min(64,(frame-14)*4); x,y=344-sin(angle,256),84-sin(angle+64,64)
                if 56<=frame<64 or 100<=frame<108: x,y=344,-174
                if 72<=frame<80 or 116<=frame<124: x,y=88,-168
                if frame>=198:
                    t=frame-197; z=max(0,256-8*t)
                    x=88+sin(min(t,16)*4,60) if t<=16 else 128+sin(min(t,32)*4,20)
                    y=84; fade=min(16,max(0,(frame-212)//4))
                params.append({'clip':32,'fadeIn':max(0,16-frame),'fadeOut':fade})
            # Fixed-point nearest sampling, wrapped at the declared affine texture boundary.
            colors=pal[:]
            if name=='groudon':
                a=frame-10
                if 18<=a<28: colors[31]=pal[0xF1+min(4,(a-18)//2)]
                if 28<=a<30: colors[31]=pal[0xF5]
                if 30<=a<42: colors[31]=pal[0xF6-(a-30)//2]
                if a>=42: colors[31]=pal[0xF1]
            else:
                if 129<=frame<149: colors[47]=pal[0xF5-(frame-129)//4]
                if 149<=frame<157: colors[47]=pal[0xF1]
                if 157<=frame<181: colors[47]=pal[0xF1+(frame-157)//4]
                if frame>=181: colors[47]=pal[0xF6]
            out=Image.new('RGBA',(240,160))
            pixels=texture.load()
            indices=[pixels[(128+((dx-x)*z>>8))&511,(128+((dy-y)*z>>8))&511] for dy in range(160) for dx in range(240)]
            out.putdata([(*colors[pixel[0]],pixel[3]) for pixel in indices])
            frames.append(out)
        for chunk in range((length+119)//120):
            selected=frames[chunk*120:(chunk+1)*120]
            sheet=Image.new('RGBA',(240,160*len(selected)))
            for i,image in enumerate(selected): sheet.paste(image,(0,i*160))
            art.add(f'movie-{name}-affine-{chunk}',sheet)
        curves[name]=params
    return curves
