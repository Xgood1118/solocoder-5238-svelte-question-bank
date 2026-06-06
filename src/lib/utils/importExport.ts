import type { Question, QuestionType, ImportReport, QuestionOption } from '$lib/types';
import { generateId } from './text';

const CSV_FIELD_MAP: Record<string, keyof Question> = {
	'type': 'type',
	'stem': 'stem',
	'option_a': 'options',
	'option_b': 'options',
	'option_c': 'options',
	'option_d': 'options',
	'answer': 'answer',
	'analysis': 'analysis',
	'knowledge_points': 'knowledgePoints',
	'difficulty': 'difficulty',
	'creator': 'creator'
};

const QUESTION_TYPES: QuestionType[] = ['choice', 'fill', 'short_answer', 'calculation', 'proof'];

function detectEncoding(buffer: ArrayBuffer): { encoding: string; hasBOM: boolean } {
	const bytes = new Uint8Array(buffer);
	if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		return { encoding: 'utf-8', hasBOM: true };
	}
	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
		return { encoding: 'utf-16le', hasBOM: true };
	}
	if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
		return { encoding: 'utf-16be', hasBOM: true };
	}
	const gbkPattern = /[\x81-\xFE][\x40-\xFE]/;
	const sample = bytes.slice(0, Math.min(bytes.length, 1024));
	let asciiCount = 0;
	let gbkCandidateCount = 0;
	for (let i = 0; i < sample.length; i++) {
		if (sample[i] < 0x80) {
			asciiCount++;
		} else if (i + 1 < sample.length && sample[i] >= 0x81 && sample[i] <= 0xFE && sample[i + 1] >= 0x40 && sample[i + 1] <= 0xFE) {
			gbkCandidateCount++;
			i++;
		}
	}
	if (gbkCandidateCount > 0) {
		return { encoding: 'gbk', hasBOM: false };
	}
	return { encoding: 'utf-8', hasBOM: false };
}

function decodeBuffer(buffer: ArrayBuffer, encoding: string, hasBOM: boolean): string {
	if (encoding === 'gbk') {
		try {
			const decoder = new TextDecoder('gbk');
			return decoder.decode(buffer);
		} catch {
			const decoder = new TextDecoder('utf-8');
			return hasBOM ? decoder.decode(buffer.slice(3)) : decoder.decode(buffer);
		}
	}
	const decoder = new TextDecoder('utf-8');
	return hasBOM ? decoder.decode(buffer.slice(3)) : decoder.decode(buffer);
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === ',') {
				result.push(current);
				current = '';
			} else if (ch === '"') {
				inQuotes = true;
			} else {
				current += ch;
			}
		}
	}
	result.push(current);
	return result;
}

function isHeaderRow(fields: string[]): boolean {
	if (fields.length < 2) return false;
	const joined = fields.join(',').toLowerCase();
	if (/^[a-z_,\s]+$/.test(joined) === false) return false;
	const matchedFields = fields.filter(f => f.toLowerCase().trim() in CSV_FIELD_MAP ||
		['type', 'stem', 'answer', 'analysis', 'difficulty', 'creator'].includes(f.toLowerCase().trim()));
	return matchedFields.length >= 3;
}

function buildOptionsFromRow(row: Record<string, string>): QuestionOption[] {
	const options: QuestionOption[] = [];
	const labels = ['A', 'B', 'C', 'D'];
	for (let i = 0; i < 4; i++) {
		const key = `option_${labels[i].toLowerCase()}`;
		const content = row[key] || row[`选项${labels[i]}`] || '';
		if (content) {
			options.push({
				id: generateId(),
				label: labels[i],
				content
			});
		}
	}
	return options;
}

function rowToQuestion(row: Record<string, string>, index: number): { question: Question | null; error: string | null } {
	const stem = row.stem || row.题干 || row['题目'] || '';
	if (!stem.trim()) {
		return { question: null, error: '题干不能为空' };
	}

	let type: QuestionType = 'choice';
	const typeStr = (row.type || row.题型 || 'choice').toLowerCase().trim();
	if (QUESTION_TYPES.includes(typeStr as QuestionType)) {
		type = typeStr as QuestionType;
	} else if (typeStr === '选择题' || typeStr === '单选') type = 'choice';
	else if (typeStr === '填空题') type = 'fill';
	else if (typeStr === '简答题') type = 'short_answer';
	else if (typeStr === '计算题') type = 'calculation';
	else if (typeStr === '证明题') type = 'proof';

	const difficulty = parseInt(row.difficulty || row.难度 || '3', 10);
	const answer = row.answer || row.答案 || '';
	const analysis = row.analysis || row.解析 || '';
	const creator = row.creator || row.命题人 || row.出题人 || '导入';

	const kpStr = row.knowledge_points || row.知识点 || row.knowledgePoint || '';
	const knowledgePoints = kpStr ? kpStr.split(/[,，;；]/).map(s => s.trim()).filter(Boolean) : [];

	const options = buildOptionsFromRow(row);

	const now = Date.now();
	const question: Question = {
		id: generateId(),
		type,
		stem: stem.trim(),
		options,
		answer: answer.trim(),
		analysis: analysis.trim(),
		knowledgePoints,
		difficulty: Math.max(1, Math.min(5, difficulty || 3)),
		creator: creator.trim(),
		createdAt: now,
		updatedAt: now,
		relatedQuestions: [],
		versions: [],
		usageHistory: [],
		isLocked: false
	};

	return { question, error: null };
}

export function parseCSV(buffer: ArrayBuffer): ImportReport & { questions: Question[] } {
	const { encoding, hasBOM } = detectEncoding(buffer);
	const text = decodeBuffer(buffer, encoding, hasBOM);
	const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

	if (lines.length === 0) {
		return { success: 0, skipped: 0, skippedItems: [], questions: [] };
	}

	const firstLineFields = parseCSVLine(lines[0]);
	const hasHeader = isHeaderRow(firstLineFields);

	const questions: Question[] = [];
	const skippedItems: ImportReport['skippedItems'] = [];

	const startIndex = hasHeader ? 1 : 0;
	const headers = hasHeader ? firstLineFields.map(f => f.trim().toLowerCase()) : null;

	for (let i = startIndex; i < lines.length; i++) {
		const fields = parseCSVLine(lines[i]);
		const row: Record<string, string> = {};

		if (headers) {
			headers.forEach((h, idx) => {
				row[h] = fields[idx] || '';
			});
		} else {
			const defaultKeys = ['type', 'stem', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'analysis', 'knowledge_points', 'difficulty', 'creator'];
			defaultKeys.forEach((key, idx) => {
				row[key] = fields[idx] || '';
			});
		}

		const { question, error } = rowToQuestion(row, i + 1);
		if (question && !error) {
			questions.push(question);
		} else {
			skippedItems.push({
				row: i + 1,
				reason: error || '未知错误',
				data: row
			});
		}
	}

	return {
		success: questions.length,
		skipped: skippedItems.length,
		skippedItems,
		questions
	};
}

export function parseJSON(buffer: ArrayBuffer): ImportReport & { questions: Question[] } {
	const text = new TextDecoder('utf-8').decode(buffer);
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return {
			success: 0,
			skipped: 1,
			skippedItems: [{ row: 0, reason: 'JSON 解析失败：' + (e as Error).message, data: {} }],
			questions: []
		};
	}

	const questions: Question[] = [];
	const skippedItems: ImportReport['skippedItems'] = [];
	const arr = Array.isArray(data) ? data : [data];

	const now = Date.now();
	arr.forEach((item, idx) => {
		if (typeof item !== 'object' || item === null) {
			skippedItems.push({ row: idx + 1, reason: '数据格式不正确', data: {} });
			return;
		}
		const obj = item as Record<string, unknown>;
		if (!obj.stem || typeof obj.stem !== 'string' || !obj.stem.trim()) {
			skippedItems.push({ row: idx + 1, reason: '题干不能为空', data: obj as Record<string, string> });
			return;
		}

		const id = (obj.id as string) || generateId();
		questions.push({
			id,
			type: (obj.type as QuestionType) || 'choice',
			stem: obj.stem as string,
			options: Array.isArray(obj.options) ? (obj.options as QuestionOption[]) : [],
			answer: (obj.answer as string) || '',
			analysis: (obj.analysis as string) || '',
			knowledgePoints: Array.isArray(obj.knowledgePoints) ? (obj.knowledgePoints as string[]) : [],
			difficulty: typeof obj.difficulty === 'number' ? Math.max(1, Math.min(5, obj.difficulty)) : 3,
			creator: (obj.creator as string) || '导入',
			createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : now,
			updatedAt: now,
			relatedQuestions: Array.isArray(obj.relatedQuestions) ? (obj.relatedQuestions as string[]) : [],
			versions: [],
			usageHistory: [],
			isLocked: !!obj.isLocked
		});
	});

	return {
		success: questions.length,
		skipped: skippedItems.length,
		skippedItems,
		questions
	};
}

export function exportCSV(questions: Question[]): string {
	const headers = ['type', 'stem', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'analysis', 'knowledge_points', 'difficulty', 'creator'];
	const escape = (s: string) => {
		if (s.includes(',') || s.includes('"') || s.includes('\n')) {
			return '"' + s.replace(/"/g, '""') + '"';
		}
		return s;
	};

	const lines = [headers.join(',')];
	for (const q of questions) {
		const opts = [...q.options];
		while (opts.length < 4) opts.push({ id: '', label: '', content: '' });
		const row = [
			q.type,
			q.stem,
			opts[0]?.content || '',
			opts[1]?.content || '',
			opts[2]?.content || '',
			opts[3]?.content || '',
			q.answer,
			q.analysis,
			q.knowledgePoints.join(';'),
			String(q.difficulty),
			q.creator
		].map(escape);
		lines.push(row.join(','));
	}
	return lines.join('\n');
}

export function exportSkippedCSV(skippedItems: ImportReport['skippedItems']): string {
	if (skippedItems.length === 0) return '';
	const keys = Object.keys(skippedItems[0].data);
	keys.push('错误原因');
	keys.unshift('行号');

	const escape = (s: string) => {
		if (s.includes(',') || s.includes('"') || s.includes('\n')) {
			return '"' + s.replace(/"/g, '""') + '"';
		}
		return s;
	};

	const lines = [keys.join(',')];
	for (const item of skippedItems) {
		const row = keys.map(k => {
			if (k === '行号') return String(item.row);
			if (k === '错误原因') return item.reason;
			return item.data[k] || '';
		}).map(escape);
		lines.push(row.join(','));
	}
	return lines.join('\n');
}
