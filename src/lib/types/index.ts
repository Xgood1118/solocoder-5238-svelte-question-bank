export type QuestionType = 'choice' | 'fill' | 'short_answer' | 'calculation' | 'proof';

export interface QuestionOption {
	id: string;
	label: string;
	content: string;
	image?: string;
}

export interface QuestionVersion {
	id: string;
	timestamp: number;
	editor: string;
	data: Partial<Question>;
}

export interface UsageRecord {
	id: string;
	examName: string;
	examDate: number;
	published: boolean;
}

export interface Question {
	id: string;
	type: QuestionType;
	stem: string;
	options: QuestionOption[];
	answer: string;
	analysis: string;
	knowledgePoints: string[];
	difficulty: number;
	creator: string;
	createdAt: number;
	updatedAt: number;
	image?: string;
	relatedQuestions: string[];
	versions: QuestionVersion[];
	usageHistory: UsageRecord[];
	isLocked: boolean;
}

export interface KnowledgeNode {
	id: string;
	name: string;
	children: KnowledgeNode[];
	parentId: string | null;
}

export interface ImportReport {
	success: number;
	skipped: number;
	skippedItems: {
		row: number;
		reason: string;
		data: Record<string, string>;
	}[];
}

export interface DuplicateCandidate {
	question: Question;
	similarity: number;
}

export interface Exam {
	id: string;
	name: string;
	date: number;
	published: boolean;
	questionIds: string[];
	creator: string;
}
