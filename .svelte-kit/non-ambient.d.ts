
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/import" | "/knowledge" | "/questions" | "/questions/new" | "/questions/[id]" | "/questions/[id]/edit";
		RouteParams(): {
			"/questions/[id]": { id: string };
			"/questions/[id]/edit": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined };
			"/import": Record<string, never>;
			"/knowledge": Record<string, never>;
			"/questions": { id?: string | undefined };
			"/questions/new": Record<string, never>;
			"/questions/[id]": { id: string };
			"/questions/[id]/edit": { id: string }
		};
		Pathname(): "/" | "/import" | "/knowledge" | "/questions" | "/questions/new" | `/questions/${string}/edit` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}