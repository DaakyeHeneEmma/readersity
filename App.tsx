import React, {useMemo, useState} from 'react';
import {
  Image, ImageBackground, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';

type Screen = 'splash' | 'home' | 'search' | 'shelf' | 'details';
const BLUE = '#0F36BF';
const GOLD = '#D1AC05';
const F = 'Inria Sans';

// Exported by the supplied Figma design. See README before shipping.
const asset = {
  pattern: 'https://www.figma.com/api/mcp/asset/6d9edde6-896c-4454-bd77-cb50529d0d52.png',
  hero: 'https://www.figma.com/api/mcp/asset/d90930e4-a554-4f6b-99e6-43e5a2cb6f30.png',
  virgin: 'https://www.figma.com/api/mcp/asset/e846f288-11ec-4008-ac0f-eafc30bdea37.png',
  focus: 'https://www.figma.com/api/mcp/asset/84fbf78d-fcee-4716-9e23-408387cf2898.png',
  miracle: 'https://www.figma.com/api/mcp/asset/fa5f58af-cc78-455a-9a47-eeaeeb3c3f5b.png',
  club: 'https://www.figma.com/api/mcp/asset/14cf3b21-a038-482e-b236-51bab8ea6b11.png',
  elon: 'https://www.figma.com/api/mcp/asset/2b8e0e7a-1b74-400f-9e39-7ec32b2c6460.png',
  subtle: 'https://www.figma.com/api/mcp/asset/3c381a32-6016-40c9-a48a-894133041f8f.png',
  zero: 'https://www.figma.com/api/mcp/asset/0a73beb6-1c92-4d0b-9196-e1e21e8eca2a.png',
  splashPattern: 'https://www.figma.com/api/mcp/asset/77cdca01-358a-4101-bfdd-74a4f5927f20.png',
  logo: 'https://www.figma.com/api/mcp/asset/f34b6d5e-a83a-4262-ab12-20ae8c14b9b8.png',
};

const books = [
  {title: 'Elon Musk', author: 'Walter Isaacson', image: asset.elon},
  {title: 'The Subtle Of Not Giving A F', author: 'Mark Manson', image: asset.subtle},
  {title: 'Zero To One', author: 'Peter Thiel', image: asset.zero},
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [shelf, setShelf] = useState<string[]>(['The Alchemist', 'Eat That Frog', 'The 7 Habits Of Highly Effective People']);
  const [query, setQuery] = useState('');
  const {width} = useWindowDimensions();
  const scale = Math.min(width / 390, 1.18);
  const filtered = useMemo(() => books.filter(b => b.title.toLowerCase().includes(query.toLowerCase())), [query]);
  const addToShelf = () => setShelf(items => items.includes('Elon Musk') ? items : [...items, 'Elon Musk']);

  const body = screen === 'splash' ? <Splash onReady={() => setScreen('home')} />
    : screen === 'home' ? <Home onSearch={() => setScreen('search')} />
    : screen === 'search' ? <Search query={query} setQuery={setQuery} books={filtered} onBook={() => setScreen('details')} />
    : screen === 'shelf' ? <Shelf books={shelf} />
    : <Details onRead={addToShelf} onBack={() => setScreen('search')} />;

  return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={BLUE}/><View style={[styles.canvas, {width: 390 * scale}]}>{body}{screen !== 'splash' && <TabBar screen={screen} go={setScreen}/>}</View></SafeAreaView>;
}

function Splash({onReady}: {onReady: () => void}) {
  return <ImageBackground source={{uri: asset.splashPattern}} resizeMode="cover" imageStyle={styles.pattern} style={[styles.screen, styles.splash]}>
    <Image source={{uri: asset.logo}} resizeMode="contain" style={styles.logo}/>
    <Text style={styles.splashTag}>Read, Think & Grow Rich</Text>
    <Text style={styles.journey}>Start Your Journey With Books</Text>
    <Pressable onPress={onReady} style={styles.ready}><Text style={styles.readyText}>Ready</Text><Text style={styles.readyArrow}>→</Text></Pressable>
    <Text style={styles.community}>Join The Community</Text>
  </ImageBackground>;
}

function Header({title, children}: {title?: string; children?: React.ReactNode}) {
  return <ImageBackground source={{uri: asset.pattern}} resizeMode="cover" imageStyle={styles.pattern} style={styles.header}>
    {title && <Text style={styles.headerTitle}>{title}</Text>}{children}
  </ImageBackground>;
}

function Home({onSearch}: {onSearch: () => void}) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
    <Header><Image source={{uri: asset.hero}} style={styles.heroArt}/><Text style={styles.question}>Read Anything Today?</Text><Pressable onPress={onSearch} style={styles.searchCircle}><Text style={styles.searchGlyph}>⌕</Text></Pressable>
      <View style={styles.featureCard}><Image source={{uri: asset.virgin}} style={styles.featureCover}/><View><Text style={styles.featureTitle}>The Virgin Way</Text><Text style={styles.featureAuthor}>Richard Branson</Text><Text style={styles.featureMeta}>◉ 4.5    ◉ 1.2k</Text></View></View>
    </Header>
    <View style={styles.tabs}><Text style={styles.activeTab}>All Books</Text><Text style={styles.tab}>Popular</Text></View>
    <View style={styles.monthHeading}><Text style={styles.monthTitle}>Book of the month</Text><Text style={styles.chevron}>›</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>{[[asset.focus,'The Power Of\nFocus'],[asset.miracle,'The Miracle\nMorning'],[asset.club,'The 5AM\nClub']].map(([image, title]) => <View key={String(title)} style={styles.monthCard}><Image source={{uri: String(image)}} style={styles.monthCover}/><Text style={styles.monthText}>{title as string}</Text></View>)}</ScrollView>
  </ScrollView>;
}

function Search({query, setQuery, books: list, onBook}: {query: string; setQuery: (q: string) => void; books: typeof books; onBook: () => void}) {
  return <View style={styles.screen}><Header title="Search Books"><View style={styles.searchRow}><Text style={styles.searchGlyph}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search books" placeholderTextColor="#B7C1E7" style={styles.input}/></View></Header>
    <ScrollView contentContainerStyle={styles.list}>{list.map((book, index) => <Pressable key={book.title} onPress={index === 0 ? onBook : undefined} style={styles.bookRow}><Image source={{uri: book.image}} style={styles.bookCover}/><View style={styles.bookInfo}><Text style={styles.bookTitle}>{book.title}</Text><Text style={styles.bookAuthor}>{book.author}</Text></View></Pressable>)}</ScrollView>
  </View>;
}

function Shelf({books: list}: {books: string[]}) { return <View style={styles.screen}><Header title="Book Shelve"><View style={styles.searchRow}><Text style={styles.searchGlyph}>⌕</Text><Text style={styles.placeholder}>Search your shelf</Text></View></Header><View style={styles.shelfList}>{list.map((title, i) => <View style={styles.shelfRow} key={title}><View><Text style={styles.shelfTitle}>{title}</Text><Text style={styles.shelfAuthor}>{['Paulo Coelho','Brian Tracy','Stephen R. Covey','Walter Isaacson'][i] || 'Author'}</Text></View><Text style={styles.chevron}>›</Text></View>)}</View></View>; }

function Details({onRead, onBack}: {onRead: () => void; onBack: () => void}) { return <ScrollView style={styles.screen} contentContainerStyle={styles.detail}><Header/><View style={styles.detailHero}><Image source={{uri: asset.elon}} style={styles.detailCover}/><View style={styles.detailName}><Text style={styles.detailHeader}>Book Details</Text><Text style={styles.bookTitle}>Elon Musk</Text><Text style={styles.bookAuthor}>Walter Isaacson</Text></View></View><View style={styles.summary}><Text style={styles.summaryTitle}>Summary</Text><Text style={styles.summaryText}>When Elon Musk was a kid in South Africa, he was regularly beaten by bullies. One day a group pushed him down concrete steps and kicked him until his face was swollen. <Text style={styles.readMore}>Read more</Text></Text></View><Pressable onPress={onRead} style={[styles.action, styles.readAction]}><Text style={styles.actionText}>Want To Read  →</Text></Pressable><Pressable onPress={onBack} style={[styles.action, styles.backAction]}><Text style={styles.actionText}>←  Back To Search</Text></Pressable><View style={styles.divider}/><View style={styles.recommendations}>{books.slice(2).concat(books.slice(1,2)).map(b => <View style={styles.rec} key={b.title}><Image source={{uri: b.image}} style={styles.recCover}/><Text style={styles.recTitle} numberOfLines={1}>{b.title}</Text><Text style={styles.recAuthor}>{b.author}</Text></View>)}</View></ScrollView>; }

function TabBar({screen, go}: {screen: Screen; go: (screen: Screen) => void}) { return <View style={styles.tabbar}><Pressable onPress={() => go('home')} style={[styles.tabButton, screen === 'home' && styles.selectedTab]}><Text style={styles.tabIcon}>⌂</Text>{screen === 'home' && <Text style={styles.selectedLabel}>Home</Text>}</Pressable><Pressable onPress={() => go('search')}><Text style={styles.tabIcon}>▣</Text></Pressable><Pressable onPress={() => go('shelf')} style={[styles.tabButton, screen === 'shelf' && styles.selectedTab]}><Text style={styles.tabIcon}>▤</Text>{screen === 'shelf' && <Text style={styles.selectedLabel}>Shelve</Text>}</Pressable></View>; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:BLUE,alignItems:'center'}, canvas:{flex:1,maxWidth:456,overflow:'hidden',backgroundColor:'#fff'}, screen:{flex:1,backgroundColor:'#fff'}, splash:{alignItems:'center',backgroundColor:BLUE}, pattern:{opacity:.18}, logo:{position:'absolute',top:100,width:282,height:103}, splashTag:{position:'absolute',top:195,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:13}, journey:{position:'absolute',top:380,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:20}, ready:{position:'absolute',top:420,width:319,height:55,borderRadius:20,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,elevation:5}, readyText:{fontFamily:F,fontSize:24,fontWeight:'700',color:'#464343'}, readyArrow:{fontSize:25,color:'#464343'}, community:{position:'absolute',bottom:100,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:16}, header:{height:395,backgroundColor:BLUE,borderBottomRightRadius:50,overflow:'hidden'}, headerTitle:{position:'absolute',top:54,left:36,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:28}, heroArt:{position:'absolute',top:55,left:12,width:164,height:164}, question:{position:'absolute',top:125,left:35,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:16}, searchCircle:{position:'absolute',top:122,right:20,width:44,height:44,alignItems:'center',justifyContent:'center'}, searchGlyph:{fontSize:32,color:'#fff',fontWeight:'700'}, featureCard:{position:'absolute',top:210,left:27,width:222,height:160,borderRadius:20,backgroundColor:'#fff',elevation:4,flexDirection:'row',padding:9,gap:8}, featureCover:{width:113,height:140,borderRadius:8}, featureTitle:{fontFamily:F,fontWeight:'700',fontSize:13,marginTop:50}, featureAuthor:{fontFamily:F,fontSize:11}, featureMeta:{marginTop:13,color:'#fff',backgroundColor:'rgba(28,84,227,.5)',borderRadius:10,fontSize:8,padding:3}, homeContent:{paddingBottom:86}, tabs:{marginTop:32,marginHorizontal:52,height:28,borderRadius:10,backgroundColor:'rgba(15,54,191,.2)',flexDirection:'row',justifyContent:'space-around',alignItems:'center'}, activeTab:{color:'#5D5FEF',fontFamily:F,fontWeight:'700',fontSize:14}, tab:{color:'#5D5FEF',fontFamily:F,fontWeight:'700',fontSize:14}, monthHeading:{marginTop:29,marginHorizontal:29,flexDirection:'row',justifyContent:'space-between'}, monthTitle:{fontFamily:F,fontWeight:'700',color:BLUE,fontSize:18}, chevron:{fontSize:28,color:BLUE}, monthRow:{paddingLeft:28,gap:19,paddingTop:18}, monthCard:{width:137}, monthCover:{width:137,height:160,borderRadius:20}, monthText:{fontFamily:F,fontWeight:'700',color:BLUE,fontSize:12,marginTop:8}, searchRow:{position:'absolute',top:127,left:36,width:318,height:44,flexDirection:'row',alignItems:'center'}, input:{marginLeft:17,flex:1,height:44,borderLeftWidth:1,borderColor:'#fff',color:'#fff',paddingLeft:18,fontFamily:F}, placeholder:{marginLeft:17,flex:1,height:44,borderLeftWidth:1,borderColor:'#fff',color:'#D9E0FB',paddingLeft:18,fontFamily:F}, list:{paddingHorizontal:12,paddingTop:20,paddingBottom:75,gap:8}, bookRow:{height:164,flexDirection:'row',gap:18,alignItems:'center'}, bookCover:{width:169,height:164,borderRadius:5,backgroundColor:'#3D3535'}, bookInfo:{flex:1}, bookTitle:{fontFamily:F,fontWeight:'700',fontSize:24,color:'#000'}, bookAuthor:{fontFamily:F,fontWeight:'700',fontSize:15,color:'rgba(0,0,0,.8)',marginTop:7}, shelfList:{paddingTop:22,paddingHorizontal:15,gap:11}, shelfRow:{height:59,borderRadius:10,backgroundColor:'rgba(217,215,215,.47)',paddingLeft:25,paddingRight:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, shelfTitle:{fontFamily:F,fontWeight:'700',fontSize:20,color:'#020E39'}, shelfAuthor:{fontFamily:F,fontWeight:'700',fontSize:14,color:'rgba(0,0,0,.5)',marginTop:-2}, detail:{paddingBottom:86}, detailHero:{height:158,marginTop:-265,marginHorizontal:14,flexDirection:'row',alignItems:'flex-end'}, detailCover:{width:176,height:253,borderRadius:20,backgroundColor:'#3D3535'}, detailName:{paddingLeft:26,paddingBottom:6}, detailHeader:{position:'absolute',bottom:140,left:26,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:28,width:180}, detailHeader:{position:'absolute',bottom:140,left:26,color:'#fff',fontFamily:F,fontWeight:'700',fontSize:28,width:180}, detailName:{paddingLeft:26,paddingBottom:6}, summary:{marginTop:112,marginHorizontal:23}, summaryTitle:{fontFamily:F,fontWeight:'700',fontSize:24}, summaryText:{fontFamily:F,fontSize:12,lineHeight:15,color:'rgba(0,0,0,.8)',marginTop:7}, readMore:{color:'#0C3DEA'}, action:{height:46,marginHorizontal:42,borderRadius:20,alignItems:'center',justifyContent:'center',marginTop:19,elevation:4}, readAction:{backgroundColor:BLUE}, backAction:{backgroundColor:GOLD,marginTop:19}, actionText:{fontFamily:F,fontSize:24,fontWeight:'700',color:'#fff'}, divider:{height:1,backgroundColor:'#D8D8D8',marginHorizontal:32,marginTop:18}, recommendations:{flexDirection:'row',gap:8,marginTop:16,paddingHorizontal:9}, rec:{width:118}, recCover:{width:118,height:93,borderRadius:5}, recTitle:{fontFamily:F,fontWeight:'700',fontSize:15,marginTop:9}, recAuthor:{fontFamily:F,fontWeight:'700',fontSize:12,color:'rgba(0,0,0,.8)'}, tabbar:{position:'absolute',bottom:0,left:0,right:0,height:65,borderTopLeftRadius:10,borderTopRightRadius:10,backgroundColor:BLUE,flexDirection:'row',alignItems:'center',justifyContent:'space-around'}, tabButton:{height:44,minWidth:44,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9}, selectedTab:{paddingHorizontal:14,backgroundColor:'#fff',borderRadius:20}, tabIcon:{fontSize:27,color:'#fff'}, selectedLabel:{fontFamily:F,fontWeight:'700',fontSize:14,color:BLUE}
});

