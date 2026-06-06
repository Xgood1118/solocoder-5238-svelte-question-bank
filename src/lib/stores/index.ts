import { writable, derived, get } from 'svelte/store';
import type { Question, KnowledgeNode, Exam } from '$lib/types';
import { generateId, textSimilarity, keywordCount } from '$lib/utils/text';
import { getAllDescendantIds, findNode, addNode as _addNode, moveNode as _moveNode, deleteNode as _deleteNode, renameNode as _renameNode, flattenNodes } from '$lib/utils/knowledgeTree';

const STORAGE_KEY_QUESTIONS = 'question_bank_questions';
const STORAGE_KEY_KNOWLEDGE = 'question_bank_knowledge';
const STORAGE_KEY_EXAMS = 'question_bank_exams';

function loadFromStorage<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (raw) return JSON.parse(raw) as T;
	} catch (e) {
		console.error('Failed to load from storage:', e);
	}
	return fallback;
}

function saveToStorage<T>(key: string, value: T) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.error('Failed to save to storage:', e);
	}
}

const defaultKnowledgeRoot: KnowledgeNode = {
	id: 'root',
	name: '全部知识点',
	parentId: null,
	children: [
		{
			id: 'algebra',
			name: '代数',
			parentId: 'root',
			children: [
				{
					id: 'quadratic',
					name: '二次函数',
					parentId: 'algebra',
					children: [
						{ id: 'quadratic-graph', name: '图像与性质', parentId: 'quadratic', children: [] },
						{ id: 'quadratic-equation', name: '二次方程', parentId: 'quadratic', children: [] },
						{ id: 'quadratic-inequality', name: '二次不等式', parentId: 'quadratic', children: [] }
					]
				},
				{
					id: 'linear',
					name: '一次函数',
					parentId: 'algebra',
					children: [
						{ id: 'linear-equation', name: '一元一次方程', parentId: 'linear', children: [] },
						{ id: 'linear-system', name: '二元一次方程组', parentId: 'linear', children: [] }
					]
				},
				{
					id: 'sequence',
					name: '数列',
					parentId: 'algebra',
					children: [
						{ id: 'arithmetic', name: '等差数列', parentId: 'sequence', children: [] },
						{ id: 'geometric', name: '等比数列', parentId: 'sequence', children: [] }
					]
				}
			]
		},
		{
			id: 'geometry',
			name: '几何',
			parentId: 'root',
			children: [
				{
					id: 'plane-geo',
					name: '平面几何',
					parentId: 'geometry',
					children: [
						{ id: 'triangle', name: '三角形', parentId: 'plane-geo', children: [] },
						{ id: 'quadrilateral', name: '四边形', parentId: 'plane-geo', children: [] },
						{ id: 'circle', name: '圆', parentId: 'plane-geo', children: [] }
					]
				},
				{
					id: 'solid-geo',
					name: '立体几何',
					parentId: 'geometry',
					children: [
						{ id: 'prism', name: '棱柱与棱锥', parentId: 'solid-geo', children: [] },
						{ id: 'sphere', name: '球', parentId: 'solid-geo', children: [] }
					]
				}
			]
		},
		{
			id: 'probability',
			name: '概率与统计',
			parentId: 'root',
			children: [
				{ id: 'prob', name: '概率', parentId: 'probability', children: [] },
				{ id: 'stats', name: '统计', parentId: 'probability', children: [] }
			]
		},
		{
			id: 'trigonometry',
			name: '三角函数',
			parentId: 'root',
			children: [
				{ id: 'trig-identity', name: '三角恒等变换', parentId: 'trigonometry', children: [] },
				{ id: 'trig-graph', name: '三角函数图像', parentId: 'trigonometry', children: [] }
			]
		}
	]
};

const sampleQuestions: Question[] = [
	{
		id: 'q1',
		type: 'choice',
		stem: '已知二次函数 $y = x^2 - 2x - 3$，其图像与 x 轴交点的坐标是？',
		options: [
			{ id: 'o1', label: 'A', content: '$(1, 0)$ 和 $(3, 0)$' },
			{ id: 'o2', label: 'B', content: '$(-1, 0)$ 和 $(3, 0)$' },
			{ id: 'o3', label: 'C', content: '$(1, 0)$ 和 $(-3, 0)$' },
			{ id: 'o4', label: 'D', content: '$(-1, 0)$ 和 $(-3, 0)$' }
		],
		answer: 'B',
		analysis: '令 $y = 0$，解方程 $x^2 - 2x - 3 = 0$，因式分解得 $(x-3)(x+1)=0$，所以 $x=3$ 或 $x=-1$，交点坐标为 $(-1, 0)$ 和 $(3, 0)$。',
		knowledgePoints: ['quadratic-equation', 'quadratic-graph'],
		difficulty: 2,
		creator: '张老师',
		createdAt: Date.now() - 86400000 * 10,
		updatedAt: Date.now() - 86400000 * 10,
		relatedQuestions: ['q2'],
		versions: [],
		usageHistory: [],
		isLocked: false
	},
	{
		id: 'q2',
		type: 'choice',
		stem: '二次函数 $y = 2x^2 - 4x + 1$ 的顶点坐标是？',
		options: [
			{ id: 'o5', label: 'A', content: '$(1, -1)$' },
			{ id: 'o6', label: 'B', content: '$(1, -3)$' },
			{ id: 'o7', label: 'C', content: '$(-1, -1)$' },
			{ id: 'o8', label: 'D', content: '$(2, -3)$' }
		],
		answer: 'A',
		analysis: '配方：$y = 2(x^2 - 2x) + 1 = 2(x-1)^2 - 2 + 1 = 2(x-1)^2 - 1$，顶点坐标为 $(1, -1)$。',
		knowledgePoints: ['quadratic-graph'],
		difficulty: 2,
		creator: '李老师',
		createdAt: Date.now() - 86400000 * 8,
		updatedAt: Date.now() - 86400000 * 8,
		relatedQuestions: ['q1'],
		versions: [],
		usageHistory: [
			{ id: 'u1', examName: '高一上学期第一次月考', examDate: Date.now() - 86400000 * 5, published: true }
		],
		isLocked: true
	},
	{
		id: 'q3',
		type: 'fill',
		stem: '等差数列 $\\{a_n\\}$ 中，$a_1 = 2$，公差 $d = 3$，则 $a_{10} = $ ______。',
		options: [],
		answer: '$29$',
		analysis: '$a_n = a_1 + (n-1)d = 2 + 9 \\times 3 = 29$。',
		knowledgePoints: ['arithmetic'],
		difficulty: 1,
		creator: '王老师',
		createdAt: Date.now() - 86400000 * 6,
		updatedAt: Date.now() - 86400000 * 6,
		relatedQuestions: [],
		versions: [],
		usageHistory: [],
		isLocked: false
	},
	{
		id: 'q4',
		type: 'calculation',
		stem: '已知 $\\sin\\alpha = \\frac{3}{5}$，且 $\\alpha$ 是第二象限角，求 $\\cos\\alpha$ 和 $\\tan\\alpha$ 的值。',
		options: [],
		answer: '$\\cos\\alpha = -\\frac{4}{5}$，$\\tan\\alpha = -\\frac{3}{4}$',
		analysis: '由 $\\sin^2\\alpha + \\cos^2\\alpha = 1$，得 $\\cos^2\\alpha = 1 - \\frac{9}{25} = \\frac{16}{25}$。\n\n因为 $\\alpha$ 是第二象限角，所以 $\\cos\\alpha < 0$，即 $\\cos\\alpha = -\\frac{4}{5}$。\n\n$\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{\\frac{3}{5}}{-\\frac{4}{5}} = -\\frac{3}{4}$。',
		knowledgePoints: ['trig-identity'],
		difficulty: 3,
		creator: '赵老师',
		createdAt: Date.now() - 86400000 * 4,
		updatedAt: Date.now() - 86400000 * 4,
		relatedQuestions: [],
		versions: [],
		usageHistory: [],
		isLocked: false
	},
	{
		id: 'q5',
		type: 'choice',
		stem: '下列函数中，在区间 $(0, +\\infty)$ 上是增函数的是？',
		options: [
			{ id: 'o9', label: 'A', content: '$y = -x^2$' },
			{ id: 'o10', label: 'B', content: '$y = \\frac{1}{x}$' },
			{ id: 'o11', label: 'C', content: '$y = x^2 + 2x$' },
			{ id: 'o12', label: 'D', content: '$y = -2x + 1$' }
		],
		answer: 'C',
		analysis: 'A 选项：开口向下，在 $(0, +\\infty)$ 递减。\nB 选项：反比例函数，在 $(0, +\\infty)$ 递减。\nC 选项：$y = (x+1)^2 - 1$，开口向上，对称轴 $x=-1$，在 $(0, +\\infty)$ 递增。\nD 选项：一次函数，斜率为负，递减。',
		knowledgePoints: ['quadratic-graph', 'linear'],
		difficulty: 2,
		creator: '张老师',
		createdAt: Date.now() - 86400000 * 2,
		updatedAt: Date.now() - 86400000 * 2,
		relatedQuestions: [],
		versions: [],
		usageHistory: [],
		isLocked: false
	},
	{
		id: 'q6',
		type: 'proof',
		stem: '证明：如果 $a > b > 0$，那么 $\\sqrt{a} > \\sqrt{b}$。',
		options: [],
		answer: '略',
		analysis: '**证法一（作差法）：**\n\n$\\sqrt{a} - \\sqrt{b} = \\frac{(\\sqrt{a} - \\sqrt{b})(\\sqrt{a} + \\sqrt{b})}{\\sqrt{a} + \\sqrt{b}} = \\frac{a - b}{\\sqrt{a} + \\sqrt{b}}$\n\n因为 $a > b > 0$，所以 $a - b > 0$，$\\sqrt{a} + \\sqrt{b} > 0$，故 $\\sqrt{a} - \\sqrt{b} > 0$，即 $\\sqrt{a} > \\sqrt{b}$。\n\n**证法二（反证法）：**\n假设 $\\sqrt{a} \\leq \\sqrt{b}$，因为两边都是非负数，平方得 $a \\leq b$，与 $a > b$ 矛盾。所以假设不成立，故 $\\sqrt{a} > \\sqrt{b}$。',
		knowledgePoints: ['algebra'],
		difficulty: 3,
		creator: '陈老师',
		createdAt: Date.now() - 86400000 * 1,
		updatedAt: Date.now() - 86400000 * 1,
		relatedQuestions: [],
		versions: [],
		usageHistory: [],
		isLocked: false
	}
];

export const questions = writable<Question[]>(loadFromStorage(STORAGE_KEY_QUESTIONS, sampleQuestions));
export const knowledgeRoot = writable<KnowledgeNode>(loadFromStorage(STORAGE_KEY_KNOWLEDGE, defaultKnowledgeRoot));
export const exams = writable<Exam[]>(loadFromStorage(STORAGE_KEY_EXAMS, []));
export const currentUser = writable<string>('张老师');
export const isGroupLeader = writable<boolean>(true);

questions.subscribe(val => saveToStorage(STORAGE_KEY_QUESTIONS, val));
knowledgeRoot.subscribe(val => saveToStorage(STORAGE_KEY_KNOWLEDGE, val));
exams.subscribe(val => saveToStorage(STORAGE_KEY_EXAMS, val));

export function addQuestion(q: Question) {
	questions.update(arr => {
		const idx = arr.findIndex(item => item.id === q.id);
		if (idx >= 0) {
			const newArr = [...arr];
			newArr[idx] = q;
			return newArr;
		}
		return [...arr, q];
	});
}

export function updateQuestion(id: string, data: Partial<Question>, editor: string) {
	questions.update(arr => {
		return arr.map(q => {
			if (q.id !== id) return q;
			const version = {
				id: generateId(),
				timestamp: Date.now(),
				editor,
				data: { ...q } as Partial<Question>
			};
			return {
				...q,
				...data,
				updatedAt: Date.now(),
				versions: [...q.versions, version].slice(-20)
			};
		});
	});
}

export function deleteQuestion(id: string) {
	questions.update(arr => arr.filter(q => q.id !== id));
}

export function rollbackQuestion(id: string, versionId: string) {
	questions.update(arr => {
		return arr.map(q => {
			if (q.id !== id) return q;
			const ver = q.versions.find(v => v.id === versionId);
			if (!ver) return q;
			return {
				...q,
				...ver.data,
				id: q.id,
				versions: q.versions,
				updatedAt: Date.now()
			};
		});
	});
}

export function findDuplicates(stem: string, excludeId?: string): { question: Question; similarity: number }[] {
	const all = get(questions);
	const results: { question: Question; similarity: number }[] = [];
	for (const q of all) {
		if (excludeId && q.id === excludeId) continue;
		const sim = textSimilarity(stem, q.stem);
		if (sim >= 0.8) {
			results.push({ question: q, similarity: sim });
		}
	}
	return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

export interface FilterOptions {
	knowledgePointIds: string[];
	difficulties: number[];
	types: string[];
	creators: string[];
	keyword: string;
	onlyUnlocked: boolean;
}

export const filteredQuestions = derived(
	[questions, knowledgeRoot],
	([$questions, $root]) => {
		return (filters: FilterOptions): Question[] => {
			let result = [...$questions];

			if (filters.onlyUnlocked) {
				result = result.filter(q => !q.isLocked);
			}

			if (filters.knowledgePointIds.length > 0) {
				const allKpIds = new Set<string>();
				for (const kpId of filters.knowledgePointIds) {
					const node = findNode($root, kpId);
					if (node) {
						const descendants = getAllDescendantIds(node);
						descendants.forEach(id => allKpIds.add(id));
					}
				}
				result = result.filter(q =>
					q.knowledgePoints.some(kp => allKpIds.has(kp))
				);
			}

			if (filters.difficulties.length > 0) {
				result = result.filter(q => filters.difficulties.includes(q.difficulty));
			}

			if (filters.types.length > 0) {
				result = result.filter(q => filters.types.includes(q.type));
			}

			if (filters.creators.length > 0) {
				result = result.filter(q => filters.creators.includes(q.creator));
			}

			if (filters.keyword.trim()) {
				const keywords = filters.keyword.trim().split(/\s+/).filter(Boolean);
				result = result.filter(q => {
					const text = q.stem + ' ' + q.analysis + ' ' + q.answer;
					return keywords.every(kw => text.toLowerCase().includes(kw.toLowerCase()));
				});
				result.sort((a, b) => {
					const textA = a.stem + ' ' + a.analysis + ' ' + a.answer;
					const textB = b.stem + ' ' + b.analysis + ' ' + b.answer;
					return keywordCount(textB, keywords) - keywordCount(textA, keywords);
				});
			}

			return result;
		};
	}
);

export const allCreators = derived(questions, $q => {
	const set = new Set($q.map(q => q.creator));
	return Array.from(set).sort();
});

export const questionCountByKp = derived(
	[questions, knowledgeRoot],
	([$questions, $root]) => {
		const map = new Map<string, number>();
		const allNodes = flattenNodes($root);
		for (const node of allNodes) {
			const descendants = getAllDescendantIds(node);
			let count = 0;
			for (const q of $questions) {
				if (q.knowledgePoints.some(kp => descendants.includes(kp))) {
					count++;
				}
			}
			map.set(node.id, count);
		}
		return map;
	}
);

export function addKnowledgeNode(parentId: string | null, name: string) {
	const id = generateId();
	knowledgeRoot.update(root => _addNode(root, parentId, name, id));
	return id;
}

export function moveKnowledgeNode(sourceId: string, targetId: string | null, position?: number) {
	knowledgeRoot.update(root => _moveNode(root, sourceId, targetId, position));
}

export function deleteKnowledgeNode(id: string) {
	knowledgeRoot.update(root => _deleteNode(root, id));
}

export function renameKnowledgeNode(id: string, name: string) {
	knowledgeRoot.update(root => _renameNode(root, id, name));
}

export function lockQuestion(id: string, examName: string) {
	questions.update(arr => arr.map(q => {
		if (q.id !== id) return q;
		return {
			...q,
			isLocked: true,
			usageHistory: [...q.usageHistory, {
				id: generateId(),
				examName,
				examDate: Date.now(),
				published: true
			}]
		};
	}));
}

export function unlockQuestion(id: string) {
	questions.update(arr => arr.map(q => {
		if (q.id !== id) return q;
		return { ...q, isLocked: false };
	}));
}
