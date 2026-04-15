import React from 'react';
import { StyleSheet, View } from 'react-native';
import Markdown, { MarkdownProps } from 'react-native-markdown-display';
import { Colors } from '../theme/colors';

interface Props extends MarkdownProps {
  children: string;
}

export default function MarkdownView({ children, ...props }: Props) {
  return (
    <Markdown
      style={markdownStyles}
      {...props}
    >
      {children}
    </Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 12,
  },
  link: {
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: Colors.bgDark,
    color: Colors.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: Colors.bgDark,
    color: Colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fence: {
    backgroundColor: Colors.bgDark,
    color: Colors.text,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  blockquote: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
  },
  th: {
    padding: 8,
    fontWeight: '700',
    backgroundColor: Colors.surface,
  },
  td: {
    padding: 8,
  },
});
