import { IconReplace } from '@codexteam/icons';
import type { InlineTool, API } from '../../../types';
import type { MenuConfig, MenuConfigItem, ToolConfig } from '../../../types/tools';
import * as _ from '../utils';
import type { Blocks, Selection, Tools, Caret, I18n } from '../../../types/api';
import SelectionUtils from '../selection';
import { getConvertibleToolsForBlock } from '../utils/blocks';
import I18nInternal from '../i18n';
import { I18nInternalNS } from '../i18n/namespace-internal';
import { config } from 'cypress/types/bluebird';
import API from '../modules/api';

/**
 * Inline tools for converting blocks
 */
export default class ConvertInlineTool implements InlineTool {
  /**
   * Specifies Tool as Inline Toolbar Tool
   */
  public static isInline = true;

  /**
   * API for working with editor blocks
   */
  private readonly blocksAPI: Blocks;

  /**
   * API for working with Selection
   */
  private readonly selectionAPI: Selection;

  /**
   * API for working with Tools
   */
  private readonly toolsAPI: Tools;

  /**
   * I18n API
   */
  private readonly i18nAPI: I18n;

  /**
   * API for working with Caret
   */
  private readonly caretAPI: Caret;

  /**
   * Config for this tool
   */
  private readonly config: ToolConfig;

  /**
   * @param api - Editor.js API
   */
  constructor({ api, config }: { api: API, config: ToolConfig }) {
    this.i18nAPI = api.i18n;
    this.blocksAPI = api.blocks;
    this.selectionAPI = api.selection;
    this.toolsAPI = api.tools;
    this.caretAPI = api.caret;
    this.config = config;
  }

  /**
   * Returns tool's UI config
   */
  public async render(): Promise<MenuConfig> {
    if (this.config.enabled !== true) {
      return [];
    }

    const currentSelection = SelectionUtils.get();
    const currentBlock = this.blocksAPI.getBlockByElement(currentSelection.anchorNode as HTMLElement);

    if (currentBlock === undefined) {
      return [];
    }

    const allBlockTools = this.toolsAPI.getBlockTools();
    const convertibleTools = await getConvertibleToolsForBlock(currentBlock, allBlockTools);

    if (convertibleTools.length === 0) {
      return [];
    }

    const convertToItems = convertibleTools.reduce<MenuConfigItem[]>((result, tool) => {
      tool.toolbox?.forEach((toolboxItem) => {
        result.push({
          icon: toolboxItem.icon,
          title: I18nInternal.t(I18nInternalNS.toolNames, toolboxItem.title),
          name: tool.name,
          closeOnActivate: true,
          onActivate: async () => {
            const newBlock = await this.blocksAPI.convert(currentBlock.id, tool.name, toolboxItem.data);

            this.caretAPI.setToBlock(newBlock, 'end');
          },
        });
      });

      return result;
    }, []);

    const currentBlockToolboxItem = await currentBlock.getActiveToolboxEntry();
    const icon = currentBlockToolboxItem !== undefined ? currentBlockToolboxItem.icon : IconReplace;
    const isDesktop =  !_.isMobileScreen();

    return {
      icon,
      name: 'convert-to',
      hint: {
        title: this.i18nAPI.t('Convert to'),
      },
      children: {
        searchable: isDesktop,
        items: convertToItems,
        onOpen: () => {
          if (isDesktop) {
            this.selectionAPI.setFakeBackground();
            this.selectionAPI.save();
          }
        },
        onClose: () => {
          if (isDesktop) {
            this.selectionAPI.restore();
            this.selectionAPI.removeFakeBackground();
          }
        },
      },
    };
  }
}
