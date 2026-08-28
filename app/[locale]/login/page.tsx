import Image from "next/image";
import {version as appVersion} from "../../../package.json";
import {getTranslations} from "next-intl/server";
import {LoginForm} from "./login-form";
import {LanguageSwitcher} from "@/components/layout/language-switcher";
import {DeployStatus} from "@/components/system/deploy-status";

/**
 * Sign-in, per the admin system-pages spec: a forest brand panel on the left,
 * the form on the right. It is the mirror of what was here before — the panel
 * has moved from right to left and the four `blur-3xl` glows are gone, because
 * the DS bans glass blur outright.
 *
 * THE PANEL IS ONE COLUMN. That is the whole layout: a single 640px column,
 * centred in the panel, and every band in it — mark, illustration, prose,
 * status strip — starting on that column's left edge. Nothing is centred on its
 * own and nothing is flush against the panel's own edge. Earlier passes sized
 * each band separately (the card at 64% and `mx-auto`, the prose at 540, the
 * mark and the strip against the 34px gutter) and the result had four different
 * left edges, which is what made a correctly-sized illustration still look
 * wrong. One column, one rail, and the panel's slack sits outside it.
 *
 * The 640px measure comes from the artwork: at 1.74:1 a 640px card stands
 * ~404px tall, which leaves the mark, the prose and the strip room inside a
 * 900px viewport at every width from lg up. Below ~1311px the column is
 * narrower than 640 and simply takes what the panel has.
 *
 * Vertical rhythm follows proximity, not even spacing: `justify-between` pushes
 * the mark and the strip to the ends, while the illustration and the prose it
 * illustrates sit 28px apart as one group in the middle. Three bands, two of
 * them one thing.
 *
 * The crew illustration is on the panel, which the spec does not ask for — it
 * wants type and one dot grid there and nothing else. It is here because it was
 * asked for, and it earns the exception the way the old page did: a light card.
 * The artwork is forest ink on transparency, so on a forest ground it would
 * simply vanish. The card is also, deliberately, the floor the crew stands on —
 * the PNG is trimmed to its own ink and sits flush to the bottom edge, with a
 * horizontal inset wider than the 28px corner radius so the ground line clears
 * the curve instead of being clipped by it. Flat white fill and the mark tile's
 * shadow recipe one size up; no blur, no chips, nothing else added.
 *
 * The prose keeps a 540px measure inside the 640px column, because column width
 * and line length are different questions. 640px of 15px text runs to ~85
 * characters, past the point where the eye finds the next line reliably.
 *
 * `bg-white`, not `bg-card`: this panel is forest in BOTH themes, so a semantic
 * surface token would flip to forest-700 in dark mode and take with it the one
 * thing the card exists to provide.
 *
 * `alt=""` because the illustration says what `brandTitle` and `brandBody`
 * already say in words — announcing it a second time is noise, not access.
 *
 * The split is 48/52 at lg and 54/46 from xl. Percentages, not the mock's fixed
 * 430px: pinned at 430px a 1920 screen turns the panel into a fifth of the page
 * instead of a third. But 38% — 430 read as a fraction of the mock's own 1120px
 * frame — was the same error a step milder, because it made the brand side the
 * visibly smaller half of a page it is meant to anchor. The mock is 1120px wide;
 * its proportions are not a law for 1920.
 *
 * The form side takes the remainder and never falls below ~460px of usable
 * column, so the 560px form gives up a little at 1280 and nothing at all from
 * 1600 up. No `min-w` floor on the aside: at lg, 48% is already 492px, so a
 * 430px floor could never bind.
 *
 * Version, region and health all live in DeployStatus — version from
 * package.json, region and the health probe from env, so the strip is 1:1 the
 * moment those are configured and silent rather than fabricated until then.
 */
export default async function LoginPage() {
    const t = await getTranslations('login');
    return (
        <div className="flex min-h-svh">
            <aside
                className="dot-field hidden shrink-0 flex-col overflow-hidden px-[34px] py-9 text-white lg:flex lg:w-[48%] xl:w-[54%]">
                <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-between">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-[0_6px_18px_rgba(7,35,24,0.22)]">
                            <Image
                                src="/uyer-mark.png"
                                alt="Uyer"
                                width={46}
                                height={46}
                                // `priority` is deprecated as of Next 16;
                                // `preload` names what it actually did.
                                preload
                                // 40px inside the 46px tile, not 46px scaled up.
                                // The mock fits the glyph to ~36px with ~5px of
                                // white on every side; its source PNG carries
                                // 13% padding of its own, which `object-cover`
                                // at scale 1.06 turns into that margin. Our mark
                                // is trimmed to the glyph (89% of its canvas), so
                                // the breathing room has to come from the box:
                                // 40 x 0.89 = ~36px of glyph.
                                className="size-10 object-contain"
                            />
                        </span>
                        <span className="flex flex-col gap-0.5">
                            <span className="font-heading text-base font-bold tracking-[0.16em]">UYER</span>
                            <span className="text-xs text-white/60">{t('controlCenter')}</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-7">
                        <div
                            className="overflow-hidden rounded-3xl bg-white px-8 pt-7 shadow-[0_18px_44px_rgba(7,35,24,0.3)] xl:px-10 xl:pt-9">
                            <Image
                                src="/cleaning-crew.png"
                                alt=""
                                width={1600}
                                height={919}
                                // The card fills the column, so the box is the
                                // column less the card's inset: 560px once the
                                // column is on its 640px measure, and below that
                                // 48vw less the aside's 2 x 34px gutters and the
                                // card's 2 x 32px. Without this the browser
                                // assumes 100vw and pulls a 1920w file.
                                sizes="(min-width: 1280px) 560px, calc(48vw - 132px)"
                                // Above the fold, but the sign-in heading is the
                                // LCP element, so this eagerly loads without
                                // competing for a preload slot in <head>.
                                loading="eager"
                                className="h-auto w-full"
                            />
                        </div>

                        <div className="flex max-w-[540px] flex-col gap-3">
                            <h2 className="font-heading text-[30px] leading-[1.12] font-bold tracking-[-0.03em] text-pretty">
                                {t('brandTitle')}
                            </h2>
                            <p className="text-[15px] leading-[1.55] text-white/70 text-pretty">
                                {t('brandBody')}
                            </p>
                        </div>
                    </div>

                    <DeployStatus
                        version={appVersion}
                        region={process.env.DEPLOY_REGION}
                        healthUrl={process.env.HEALTH_URL}
                    />
                </div>
            </aside>

            <main className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
                <span className="absolute top-6 right-6">
                    <LanguageSwitcher/>
                </span>

                <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[22px]">
                    <div className="flex flex-col gap-1.5">
                        <h1 className="font-heading text-[26px] font-bold tracking-[-0.02em] text-foreground">
                            {t('signIn')}
                        </h1>
                        <p className="text-[15px] text-ink-soft text-pretty">{t('staffOnly')}</p>
                    </div>

                    <LoginForm/>
                </div>
            </main>
        </div>
    );
}
