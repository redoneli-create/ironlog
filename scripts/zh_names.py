"""Generate Chinese display names for the bundled exercise metadata.

Rule-based phrase translation over the dataset vocabulary (equipment + position +
movement), with a curated override table for the exercises used by built-in
programs. Run after updating src/data/exercises.json:

    python scripts/zh_names.py
"""
import json, re, sys, collections, io

PATH = "src/data/exercises.json"

EQUIP = {
    "barbell": "杠铃", "olympic barbell": "奥杠", "ez barbell": "曲杠", "ez-bar": "曲杠",
    "trap bar": "六角杠", "dumbbell": "哑铃", "cable": "绳索", "rope": "绳索",
    "lever": "器械", "leverage machine": "器械", "machine": "器械", "smith": "史密斯",
    "smith machine": "史密斯", "kettlebell": "壶铃", "band": "弹力带",
    "resistance band": "弹力带", "medicine ball": "药球", "stability ball": "瑞士球",
    "exercise ball": "瑞士球", "bosu ball": "波速球", "bosu": "波速球",
    "body weight": "自重", "bodyweight": "自重", "weighted": "负重", "assisted": "辅助",
    "roller": "滚轮", "wheel roller": "健腹轮", "sled": "雪橇", "sled machine": "雪橇机",
    "hammer": "锤式", "tire": "轮胎", "stationary bike": "单车", "elliptical machine": "椭圆机",
    "skierg machine": "滑雪机", "stepmill machine": "爬楼机", "upper body ergometer": "手摇车",
    "bar": "杠", "v-bar": "V 把", "attachment": "配件", "towel": "毛巾",
}

POSE = {
    "one arm": "单臂", "one leg": "单腿", "two arm": "双臂", "two legs": "双腿",
    "single leg": "单腿", "single arm": "单臂", "single": "单侧", "arm": "臂", "arms": "手臂",
    "leg": "腿", "legs": "双腿", "hand": "手", "hands": "双手", "foot": "脚", "feet": "双脚",
    "knee": "膝", "knees": "双膝", "toe": "脚尖", "heel": "脚跟", "wrist": "腕", "hip": "髋",
    "alternate": "交替", "alternating": "交替", "seated": "坐姿", "standing": "站姿",
    "lying": "仰卧", "prone": "俯卧", "supine": "仰卧", "kneeling": "跪姿", "bent over": "俯身",
    "bent-over": "俯身", "bent": "屈曲", "incline": "上斜", "decline": "下斜", "flat": "平躺",
    "close grip": "窄握", "close-grip": "窄握", "wide grip": "宽握", "wide-grip": "宽握",
    "reverse grip": "反握", "reverse-grip": "反握", "neutral grip": "中立握",
    "palms in": "掌心相对", "palms": "掌心", "overhand": "正握", "underhand": "反握",
    "behind neck": "颈后", "behind the neck": "颈后", "overhead": "过头", "front": "前",
    "rear": "后", "side": "侧", "lateral": "侧", "inner": "内侧", "outer": "外侧",
    "high": "高位", "low": "低位", "upper": "上", "lower": "下", "mid": "中",
    "straight": "直", "straight arm": "直臂", "full": "全", "half": "半", "split": "分腿",
    "cross": "交叉", "cross body": "交叉", "twist": "转体", "twisting": "转体",
    "rotation": "旋转", "hanging": "悬垂", "floor": "地面", "wall": "靠墙", "bench": "长凳",
    "upright": "直立", "forward": "向前", "backward": "向后", "inverse": "反向",
    "reverse": "反向", "alternating reverse": "交替反向", "parallel": "平行",
    "vertical": "垂直", "horizontal": "水平", "narrow": "窄距", "wide": "宽距",
    "narrow stance": "窄站距", "wide stance": "宽站距", "close stance": "并腿",
    "sumo": "相扑", "romanian": "罗马尼亚", "stiff leg": "直腿", "stiff-leg": "直腿",
    "single leg": "单腿", "split": "分腿", "bulgarian": "保加利亚", "pistol": "手枪",
    "sissy": "西斯", "hack": "哈克", "zercher": "泽奇", "jefferson": "杰斐逊",
    "pendlay": "潘德雷", "turkish": "土耳其", "get up": "起立", "jefferson curl": "杰斐逊弯举",
    "good": "早安", "morning": "式", "good morning": "早安式", "military": "军式",
    "russian": "俄罗斯", "arnold": "阿诺德", "preacher": "牧师凳", "concentration": "集中",
    "spider": "蜘蛛", "drag": "拖拽", "scott": "斯科特", "landmine": "地雷管",
    "march": "踏步", "step": "台阶", "step-up": "登台阶", "box": "箱",
    "on exercise ball": "瑞士球上", "on stability ball": "瑞士球上", "on bench": "凳上",
    "on floor": "地面", "on knees": "跪姿", "on a staircase": "台阶上", "on knees": "跪姿",
    "with rope": "用绳", "with rope attachment": "用绳", "with towel": "用毛巾",
    "with support": "有支撑", "with arm blaster": "用臂托", "with band": "用弹力带",
    "with throw down": "下甩", "on the wall": "靠墙", "male": "男", "female": "女",
    "pov": "视角", "v. 2": "变式2", "v. 3": "变式3", "v. 4": "变式4", "v. 1": "变式1",
    "one and a half": "一又二分之一", "to": "", "and": "", "of": "", "the": "",
}

MOVE = {
    "bench press": "卧推", "chest press": "推胸", "shoulder press": "肩推", "push press": "借力推",
    "overhead press": "过头推举", "military press": "军式推举", "floor press": "地板卧推",
    "jm press": "JM 卧推", "guillotine press": "断头台卧推", "pin press": "支架卧推",
    "pullover": "仰卧上拉", "pull over": "仰卧上拉", "push-up": "俯卧撑", "push up": "俯卧撑",
    "pull-up": "引体向上", "pull up": "引体向上", "chin-up": "反手引体向上", "chin up": "反手引体向上",
    "chin-ups": "反手引体向上", "pull-ups": "引体向上", "dip": "臂屈伸", "dips": "臂屈伸",
    "chest dip": "双杠臂屈伸", "triceps dip": "三头臂屈伸", "bench dip": "凳上臂屈伸",
    "squat": "深蹲", "front squat": "前蹲", "hack squat": "哈克深蹲", "box squat": "箱式深蹲",
    "jump squat": "跳蹲", "squat jump": "跳蹲", "goblet squat": "高脚杯深蹲",
    "pistol squat": "手枪深蹲", "split squat": "分腿蹲", "sissy squat": "西斯深蹲",
    "sumo squat": "相扑深蹲", "deadlift": "硬拉", "romanian deadlift": "罗马尼亚硬拉",
    "stiff leg deadlift": "直腿硬拉", "sumo deadlift": "相扑硬拉", "rack pull": "架上拉",
    "lunge": "弓步", "walking lunge": "行进弓步", "reverse lunge": "后撤弓步",
    "row": "划船", "bent over row": "俯身划船", "upright row": "直立划船", "t-bar row": "T 杠划船",
    "seated row": "坐姿划船", "high row": "高位划船", "inverted row": "反向划船",
    "pendlay row": "潘德雷划船", "meadows row": "梅多斯划船",
    "curl": "弯举", "hammer curl": "锤式弯举", "preacher curl": "牧师凳弯举",
    "concentration curl": "集中弯举", "drag curl": "拖拽弯举", "spider curl": "蜘蛛弯举",
    "reverse curl": "反握弯举", "zottman curl": "佐特曼弯举", "wrist curl": "腕弯举",
    "leg curl": "腿弯举", "leg extension": "腿屈伸", "triceps extension": "三头伸展",
    "overhead triceps extension": "过头三头伸展", "skull crusher": "仰卧三头伸展",
    "french press": "法式推举", "pushdown": "下压", "triceps pushdown": "三头下压",
    "kickback": "后踢", "tricep kickback": "三头后踢", "pull through": "拉绳",
    "pulldown": "下拉", "lat pulldown": "高位下拉", "straight arm pulldown": "直臂下拉",
    "raise": "举", "lateral raise": "侧平举", "front raise": "前平举", "rear raise": "后平举",
    "calf raise": "提踵", "heel raise": "提踵", "shrug": "耸肩", "fly": "飞鸟", "flyes": "飞鸟",
    "rear delt row": "后束划船", "face pull": "面拉", "good morning": "早安式",
    "hip thrust": "臀推", "glute bridge": "臀桥", "bridge": "臀桥", "hip raise": "抬腿",
    "leg raise": "举腿", "leg-hip raise": "举腿抬髋", "knee raise": "提膝",
    "abduction": "外展", "adduction": "内收", "crunch": "卷腹", "sit-up": "仰卧起坐",
    "sit up": "仰卧起坐", "twist": "转体", "russian twist": "俄罗斯转体", "plank": "平板支撑",
    "side plank": "侧平板", "mountain climber": "登山跑", "dead bug": "死虫式",
    "hollow": "空心", "rollout": "健腹轮", "rollerout": "健腹轮", "rollout": "健腹轮",
    "leg press": "腿举", "hack press": "哈克推", "calf press": "提踵推", "chest fly": "飞鸟",
    "reverse fly": "反向飞鸟", "rear delt fly": "后束飞鸟", "lateral walk": "侧向走",
    "clean": "翻举", "power clean": "高翻", "hang clean": "悬垂翻", "snatch": "抓举",
    "jerk": "挺举", "thruster": "推举深蹲", "swing": "摆荡", "turkish get up": "土耳其起立",
    "run": "跑", "jog": "慢跑", "walk": "走", "jump": "跳", "hop": "跳", "skip": "跳步",
    "stretch": "拉伸", "hold": "保持", "march": "踏步", "climber": "登山",
    "push": "推", "pull": "拉", "lift": "提拉", "swing": "摆荡", "touch": "触",
    "rotation": "旋转", "bend": "屈", "throw": "抛", "drop": "下放", "raise": "举",
    "extension": "伸展", "flexion": "屈曲", "press": "推举", "hyperextension": "挺身",
    "shrug": "耸肩", "step": "跨步", "touchdown": "触地", "clap": "击掌",
}

# 默认计划里出现过的动作，人工校对，优先级最高
OVERRIDES = {
    "0043": "杠铃深蹲", "0025": "杠铃卧推", "0027": "杠铃俯身划船", "0091": "杠铃坐姿推举",
    "0032": "杠铃硬拉", "0662": "俯卧撑", "0652": "引体向上", "0336": "哑铃弓步",
    "0294": "哑铃弯举", "0274": "卷腹", "0085": "杠铃罗马尼亚硬拉", "0585": "腿屈伸",
    "0586": "俯卧腿弯举", "1372": "杠铃站姿提踵", "0314": "哑铃上斜卧推", "0292": "哑铃单臂俯身划船",
    "0334": "哑铃侧平举", "0380": "哑铃俯身飞鸟", "0165": "绳索锤式弯举", "0200": "绳索下压",
    "0599": "坐姿腿弯举", "0088": "杠铃坐姿提踵", "0472": "悬垂举腿", "0861": "绳索坐姿划船",
    "0383": "哑铃反向飞鸟", "0031": "杠铃弯举", "0194": "绳索过头三头伸展", "0760": "史密斯腿举",
    "1760": "哑铃高脚杯深蹲", "0289": "哑铃卧推", "0426": "哑铃站姿推举", "0313": "哑铃锤式弯举",
    "0276": "死虫式", "0499": "反向划船", "1459": "哑铃罗马尼亚硬拉", "0406": "哑铃耸肩",
    "0241": "绳索三头下压", "0117": "杠铃相扑硬拉", "1409": "杠铃臀桥", "0597": "器械坐姿髋外展",
    "0410": "哑铃单腿分腿蹲", "0196": "绳索拉绳", "0585": "腿屈伸", "0417": "哑铃站姿提踵",
    "0710": "侧卧髋外展", "1299": "器械上斜推胸", "0818": "双把高位下拉", "2287": "器械腿举",
}


EXTRA = {
    # 肌群 / 身体部位
    "biceps": "肱二头肌", "bicep": "肱二头肌", "triceps": "肱三头肌", "tricep": "肱三头肌",
    "back": "背", "chest": "胸", "shoulder": "肩", "shoulders": "肩", "delt": "三角肌",
    "deltoid": "三角肌", "lat": "背阔肌", "lats": "背阔肌", "calf": "小腿", "calves": "小腿",
    "hamstring": "腘绳肌", "hamstrings": "腘绳肌", "quads": "股四头肌", "quad": "股四头肌",
    "glute": "臀", "glutes": "臀", "neck": "颈", "elbow": "肘", "spine": "脊柱",
    "oblique": "腹斜肌", "obliques": "腹斜肌", "piriformis": "梨状肌", "femoral": "股",
    "flexor": "屈肌", "ab": "腹", "abs": "腹", "abductor": "外展肌", "adductor": "内收肌",
    "anterior": "前侧", "posterior": "后侧", "middle": "中部", "groin": "腹股沟",
    "peroneals": "腓骨肌", "posterior tibialis": "胫骨后肌", "head": "头",
    # 姿势 / 方向
    "up": "上", "down": "下", "behind": "后", "behind head": "头后", "neutral": "中立",
    "double": "双", "bars": "双杠", "suspended": "悬吊", "archer": "弓箭手",
    "squatting": "蹲姿", "raised": "抬高", "twisted": "转体", "plyo": "爆发",
    "scapula": "肩胛", "scapular": "肩胛", "self": "辅助", "slingers": "吊带",
    "jackknife": "折叠", "pallof": "帕洛夫", "fixed": "固定", "internal": "内旋",
    "external": "外旋", "revers": "反向", "revers grip": "反握", "sitted": "坐姿",
    "bottoms up": "直立", "pulley": "滑轮", "tuck": "团身", "chair": "椅",
    "extended": "伸展", "extended range": "全幅度", "cage": "架", "circles": "绕环",
    "circular": "绕环", "trainer": "训练器", "stork stance": "单腿站立", "cuban": "古巴",
    "palm in": "掌心相对", "palm up": "掌心向上", "palm rotational": "掌心旋转",
    "pronation": "旋前", "supination": "旋后", "pronated": "旋前", "supinated": "旋后",
    "pronate grip": "旋前握", "pike": "折体", "handstand": "倒立", "inchworm": "毛毛虫",
    "gripless": "无握", "muscle up": "双力臂", "muscle-up": "双力臂", "kick": "踢",
    "pelvic tilt": "骨盆后倾", "reach": "触", "potty": "深蹲", "air bike": "空中单车",
    "all fours": "四足", "apart": "分开", "astride": "分腿", "back and forth": "前后",
    "balance board": "平衡板", "bicycle": "单车", "bike": "单车", "under both": "双腿下",
    "lifting": "抬", "pin presses": "支架卧推", "bradford": "布拉德福德", "skier": "滑雪",
    "speed": "速度", "rocking": "摇摆", "basic": "基础", "battle ropes": "战绳",
    "bear crawl": "熊爬", "stabilization": "稳定", "butt ups": "臀部抬起",
    "butterfly": "蝴蝶", "judo flip": "柔道翻", "elevated": "抬高", "twists": "转体",
    "up down": "上下", "cambered": "弯曲", "captains chair": "罗马椅", "clock": "钟",
    "cocoons": "茧式", "crab": "蟹", "curtsey": "交叉步", "cycle": "单车", "deep": "深",
    "diamond": "钻石", "around": "环绕", "bowling": "保龄", "contralateral": "对侧",
    "carry": "负重行走", "around world": "环球", "above head": "过头", "balance": "平衡",
    "waiter": "服务员", "dynamic": "动态", "elevator": "上提", "off ground": "离地",
    "hug": "抱", "pyramid": "金字塔", "tennis ball": "网球", "one legged": "单腿",
    "diagonal": "对角", "anti gravity": "抗重力", "farmers": "农夫", "flag": "旗",
    "flutter kicks": "打水", "frankenstein": "弗兰肯斯坦", "frog": "青蛙", "reps": "次",
    "gorilla": "猩猩", "bends": "屈", "clasped": "交握", "hyght": "器械", "depth": "深度",
    "intermediate": "中级", "support": "支撑", "isometric": "等长", "wipers": "雨刷",
    "jack": "开合", "janda": "扬达", "advanced": "进阶", "windmill": "风车",
    "renegade": "雷内格", "hang position": "悬垂位", "figure 8": "八字", "seesaw": "跷跷板",
    "style": "式", "korean": "韩式", "lean planche": "前倾俄挺", "left hook": "左勾拳",
    "boxing": "拳击", "gripper": "握力器", "unilateral": "单侧", "london": "伦敦",
    "sit": "坐", "modified": "改良", "hindu": "印度", "monster": "怪兽", "negative": "离心",
    "outside": "外侧", "inside": "内侧", "off": "离", "plus": "加", "quarter": "四分之一",
    "quick": "快速", "reclining": "仰卧", "big": "大", "pose": "姿势", "ring": "吊环",
    "rocky": "洛奇", "climb": "爬", "equipment": "器械", "runners": "跑者", "semi": "半",
    "short stride": "短步", "chin": "引体", "skater": "滑冰", "ski": "滑雪",
    "degrees": "度", "closer": "更近", "angled": "斜", "sledge": "大锤", "sprint": "冲刺",
    "crawl": "爬行", "star": "星式", "straddle": "分腿", "superman": "超人", "flip": "翻",
    "elliptical": "椭圆", "treadmill": "跑步机", "walking": "行走", "round": "圆",
    "squeeze": "挤压", "wind sprints": "冲刺跑", "roller": "滚轮", "belt": "腰带",
    "ez": "曲杠", "sz": "曲杠", "jm": "JM", "tate": "泰特", "svend": "斯文德",
    "guillotine": "断头台", "skull crusher": "仰卧三头伸展", "french": "法式",
    # 动作补全
    "curls": "弯举", "squats": "深蹲", "kickbacks": "后踢", "thrusts": "臀推",
    "crossover": "交叉", "crossovers": "交叉", "hyper": "超伸", "hyperextension": "挺身",
    "spell caster": "施法者", "sphinx": "狮身", "stalder": "斯塔尔德", "swimmer kicks": "游泳打腿",
    "upward facing dog": "上犬式", "skin the cat": "猫式", "cossack squats": "哥萨克深蹲",
    "world greatest": "世界最伟大", "judo": "柔道", "battle": "战", "skiergometer": "滑雪机",
    "push ups": "俯卧撑", "pull ups": "引体向上", "chin ups": "反手引体向上", "sit ups": "仰卧起坐",
    "muscle upon": "双力臂", "back pec": "背胸", "shoulder tap": "触肩", "chest tap": "触胸",
    "chest pass": "胸前传球", "point stance": "三点式", "release": "释放", "slam": "砸",
    "mixed grip": "混合握", "prisoner": "囚徒", "oblique crunches": "腹斜肌卷腹",
    "pike to cobra": "折体到眼镜蛇", "power point": "力量点", "body saw": "体锯",
    "scissor jumps": "剪刀跳", "shoulder grip": "肩握", "platform slide": "平台滑",
    "skater hops": "滑冰跳", "chest pad": "胸垫", "rotary calf": "旋转提踵",
    "abdominal fallout": "腹部滚出", "between benches": "双凳间", "squat hold": "深蹲保持",
    "jump squat": "跳蹲", "body up": "起身", "down with": "下放", "legged": "腿",
    "support head": "托头", "from the hang position": "悬垂位", "hang clean": "悬垂翻",
    "one and a half": "一又二分之一", "internal rotation": "内旋", "external rotation": "外旋",
    "shoulder internal": "肩内旋", "shoulder external": "肩外旋", "into": "至",
    "hip flexor": "髋屈肌", "straight leg": "直腿", "bent knee": "屈膝", "toe": "脚尖",
    "heel": "脚跟", "raised leg": "抬腿", "single leg": "单腿", "on toes": "踮脚",
}

DROP = {"with", "on", "to", "over", "in", "from", "of", "and", "the", "a", "an", "for", "at", "by"}


MORE = {
    "grip": "握", "blaster": "臂托", "arm blaster": "臂托", "wheel": "轮", "against": "对抗",
    "donkey": "驴式", "planche": "俄挺", "burpee": "波比", "zottman": "佐特曼", "raises": "举",
    "motion": "动作", "range of motion": "全幅度", "finger": "手指", "iron": "铁", "one": "单",
    "maltese": "马耳他", "two": "双", "three": "三", "squad": "半蹲", "touchers": "触",
    "ankle": "踝", "gluteus": "臀肌", "rectus femoris": "股直肌", "pectoralis major": "胸大肌",
    "jumps": "跳", "knife": "刀", "skull": "头顶", "battling ropes": "战绳", "yoga": "瑜伽",
    "variation": "变式", "pro": "专业", "stirrups": "蹬带", "drive": "驱动", "v": "V",
    "can": "罐", "across face": "过面", "peacher": "牧师凳", "row": "划船", "rotate": "旋转",
    "step box": "台阶箱", "supported": "有支撑", "dumbbells": "哑铃", "ups": "起",
    "between ankles": "踝间", "between": "之间", "body": "身体", "face": "面", "ham": "腘绳",
    "reversed": "反向", "keens": "膝", "impossible": "不可能", "straps": "助力带",
    "strap": "助力带", "pass through": "绕环", "pirates upper": "海盗船", "out": "出",
    "kipping": "摆荡", "tap": "触", "hook": "勾拳", "left hook": "左勾拳", "catch and": "接",
    "multiple response": "多反应", "otis": "奥蒂斯", "angle": "角度", "sequence": "序列",
    "outstretched": "伸展", "ergometer": "功率器", "range": "幅度", "staircase": "台阶",
    "stepmill": "爬楼机", "rollerer": "滚轮", "gironda sternum": "吉隆达胸骨",
    "thibaudeau kayak": "皮划艇", "skullcrusher": "仰卧三头伸展", "stepbox": "台阶箱",
    "response": "反应", "depresorretractor": "下压回缩", "breeding": "展背", "piratesupper": "海盗船",
}

ALL = {}
for table in (EQUIP, POSE, MOVE, EXTRA, MORE):
    for k, v in table.items():
        k = re.sub(r"\s+", " ", k.lower().strip())
        if k and v is not None and k not in ALL:
            ALL[k] = v
MAXN = max(len(k.split()) for k in ALL)

def norm(name: str) -> str:
    s = name.lower()
    s = s.replace("v. 2", " 变式2 ").replace("v. 3", " 变式3 ").replace("v. 1", " 变式1 ")
    s = s.replace("&", " and ").replace("_", " ").replace(".", " ")
    s = re.sub(r"[()\[\],、，]", " ", s)
    s = s.replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def translate(name: str) -> str:
    toks = norm(name).split()
    out, i = [], 0
    while i < len(toks):
        if toks[i] in DROP:
            i += 1
            continue
        for n in range(min(MAXN, len(toks) - i), 0, -1):
            phrase = " ".join(toks[i:i + n])
            if phrase in ALL:
                if ALL[phrase]:
                    out.append(ALL[phrase])
                i += n
                break
        else:
            out.append(toks[i])
            i += 1
    s = "".join(out)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def assemble():
    data = json.load(open(PATH, encoding="utf-8"))
    unknown = collections.Counter()
    partial = 0
    for e in data:
        if e["id"] in OVERRIDES:
            e["zh"] = OVERRIDES[e["id"]]
            continue
        zh = translate(e["name"])
        e["zh"] = zh
        if re.search(r"[a-z]{2,}", zh):
            partial += 1
            for w in re.findall(r"[a-z][a-z\.']*", zh):
                unknown[w] += 1
    json.dump(data, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("total", len(data), "fully zh", len(data) - partial, "with latin residue", partial)
    print("TOP RESIDUE:", ", ".join(f"{w}:{c}" for w, c in unknown.most_common(400)))
    import random
    random.seed(7)
    for e in random.sample(data, 22):
        print("  " + e["name"] + "  ->  " + e["zh"])

assemble()
